/**
 * POST /api/admin/shadowing/from-youtube
 *
 * Admin pastes a YouTube URL → we build a full ShadowingLesson with
 * IPA + Vietnamese on every sentence. Two paths:
 *
 * 1. CAPTIONS path (preferred — free, fastest): fetch the video's English
 *    caption track via youtube-transcript and use it directly. Strictly
 *    English-only (we never blindly grab `captionTracks[0]` — that yielded
 *    Chinese on Netflix Anime videos before).
 *
 * 2. AUDIO path (fallback — costs ~$0.05 per video): if the captions path
 *    yields nothing AND `allowAudioFallback` is true, download the video's
 *    audio-only track with youtubei.js, transcribe it with Deepgram
 *    (utterances=true so we get sentence-shaped chunks with timestamps),
 *    then merge/normalise. Falls through to Groq Whisper inside the
 *    transcription helper if Deepgram itself is down.
 *
 * Both paths feed the same downstream pipeline:
 *   mergeCuesIntoSegments → Claude enrichShadowingSegments → DB write.
 *
 * Returns `{ id, segmentCount, enriched, method, sttSource? }` so the admin
 * client can show how the lesson was made.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  YoutubeTranscript,
  YoutubeTranscriptNotAvailableLanguageError,
} from "youtube-transcript";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import {
  extractYoutubeId,
  fetchYouTubeCaptionsViaInnertube,
  fetchYouTubeCaptionsViaInvidious,
  fetchYouTubeCaptionsViaLibrary,
  fetchYouTubeCaptionsViaPublicApi,
  getYouTubeAudioBuffer,
  getYouTubeBasicInfo,
  MAX_AUDIO_FALLBACK_SEC,
  mergeCuesIntoSegments,
  refineSegmentsForShadowing,
  youtubeThumbnail,
  type MergedSegment,
} from "@/lib/youtube";
import { enrichShadowingSegments } from "@/lib/claude";
import { deepgramTranscribeWithTimings } from "@/lib/deepgram";

/** Ratio of A-Z/a-z characters out of all non-space chars. Used to detect
 *  when YouTube returned a non-English track (e.g. Chinese) by mistake. */
function latinRatio(text: string): number {
  const stripped = text.replace(/\s+/g, "");
  if (stripped.length === 0) return 0;
  const latin = stripped.match(/[A-Za-z]/g)?.length ?? 0;
  return latin / stripped.length;
}

const bodySchema = z.object({
  /** Optional — if empty we pull it from YouTube metadata. Admin can leave
   *  this blank and the lesson still gets a proper title. */
  title: z.string().max(200).optional().default(""),
  /** Optional — defaults to the channel name from YouTube metadata. */
  source: z.string().max(80).optional().default(""),
  youtubeUrl: z.string().min(1),
  /** Whether to fall back to AI audio transcription when there are no
   *  English captions. Defaults to true — admins almost always want this. */
  allowAudioFallback: z.boolean().optional().default(true),
});

// Caption fetch alone runs 5-30s; audio fallback (download + Deepgram +
// Claude) is 60-300s for a 10-30 min video. Cap at 10 min for safety.
export const maxDuration = 600;

interface CaptionsResult {
  kind: "ok";
  cues: { offsetSec: number; durationSec: number; text: string }[];
}
interface CaptionsFail {
  kind: "fail";
  availableLangs: string[];
  reason: "no-english-track" | "non-latin-content" | "empty";
  ratio?: number;
}

async function tryCaptions(ytId: string): Promise<CaptionsResult | CaptionsFail> {
  type RawTr = { text: string; offset: number; duration: number };
  let cuesRaw: RawTr[] = [];
  let availableLangs: string[] = [];
  const triedLangs = new Set<string>();
  const tryLang = async (lang: string): Promise<RawTr[]> => {
    if (triedLangs.has(lang)) return [];
    triedLangs.add(lang);
    try {
      return await YoutubeTranscript.fetchTranscript(ytId, { lang });
    } catch (e) {
      if (e instanceof YoutubeTranscriptNotAvailableLanguageError) {
        const m = e.message.match(/Available languages:\s*(.+)$/);
        if (m) {
          availableLangs = m[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      return [];
    }
  };
  for (const lang of ["en", "en-US", "en-GB"]) {
    cuesRaw = await tryLang(lang);
    if (cuesRaw.length > 0) break;
  }
  if (cuesRaw.length === 0 && availableLangs.length > 0) {
    const englishish = availableLangs.find((l) => l.toLowerCase().startsWith("en"));
    if (englishish) cuesRaw = await tryLang(englishish);
  }
  if (cuesRaw.length === 0) {
    return { kind: "fail", availableLangs, reason: "no-english-track" };
  }
  // Sanity-check Latin ratio.
  const sampleText = cuesRaw.slice(0, 20).map((c) => c.text).join(" ");
  const ratio = latinRatio(sampleText);
  if (ratio < 0.6) {
    return { kind: "fail", availableLangs, reason: "non-latin-content", ratio };
  }
  // youtube-transcript returns srv3 (ms) or classic (sec). Heuristic: in
  // classic format a single cue's "duration" field is seconds (typical
  // 1-10s, edge cases up to ~60s for slow songs). In srv3 it's ms so
  // even short cues land at 1000+. Use 1000 as threshold — no realistic
  // caption cue is 17 MINUTES of seconds while srv3 minimum is ~500ms.
  const maxDur = Math.max(...cuesRaw.map((c) => c.duration));
  const scale = maxDur > 1000 ? 1000 : 1;
  const cues = cuesRaw.map((c) => ({
    text: c.text,
    offsetSec: c.offset / scale,
    durationSec: c.duration / scale,
  }));
  return { kind: "ok", cues };
}

interface AudioOk {
  kind: "ok";
  segments: MergedSegment[];
  sttSource: "deepgram" | "groq-whisper";
}
interface AudioFail {
  kind: "fail";
  message: string;
}

/** Map youtubei.js error messages to user-facing Vietnamese. Anything we
 *  don't recognise falls through verbatim so admins can still file a bug. */
function translateYoutubeError(raw: string): string {
  const msg = raw.toLowerCase();
  // Catch both "login_required" (raw status) and "login required" / "is
  // login required" (formatted by youtubei.js). Previously only matched the
  // underscore variant so the raw English message leaked to the UI.
  if (
    msg.includes("login_required") ||
    msg.includes("login required") ||
    msg.includes("sign in")
  )
    return "YouTube đang chặn server (bot detection). Đã thử 5 client (IOS/ANDROID/TV_EMBEDDED/WEB_EMBEDDED/MWEB), tất cả đều fail. Cần set env var YT_COOKIE trên Railway: mở YouTube logged-in trên browser → F12 → Network → request youtube.com → copy header `cookie:` → dán làm YT_COOKIE env. Sau đó video sẽ tải được.";
  if (msg.includes("private")) return "Video ở chế độ private — không tải được.";
  if (msg.includes("not available") || msg.includes("unavailable"))
    return "Video không khả dụng (đã xoá hoặc bị chặn vùng cho server).";
  if (msg.includes("livestream") || msg.includes("is_live"))
    return "Video đang livestream — không tải audio được.";
  if (msg.includes("region") || msg.includes("blocked"))
    return "Video bị chặn vùng cho server.";
  if (msg.includes("po_token") || msg.includes("po token"))
    return "YouTube đang yêu cầu PO token — server cần được verify lại. Báo dev kiểm tra YT_COOKIE.";
  return raw;
}

async function tryAudioTranscription(ytId: string): Promise<AudioOk | AudioFail> {
  let audio: Awaited<ReturnType<typeof getYouTubeAudioBuffer>>;
  try {
    audio = await getYouTubeAudioBuffer(ytId);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error(`[from-youtube] audio download failed ytId=${ytId}:`, raw);
    return {
      kind: "fail",
      message: `Tải audio thất bại: ${translateYoutubeError(raw)}`,
    };
  }
  // ~50KB threshold: 1 sec of Opus @ ~96kbps is 12KB, so anything under
  // 50KB is shorter than 5s — almost certainly a download truncation
  // rather than a real video. 10KB was too lenient and let region-blocked
  // partial streams slip through.
  if (audio.buffer.byteLength < 50_000) {
    console.warn(
      `[from-youtube] audio too small ytId=${ytId} bytes=${audio.buffer.byteLength}`,
    );
    return {
      kind: "fail",
      message: `Audio quá nhỏ (${audio.buffer.byteLength} bytes) — video có thể bị chặn vùng cho server.`,
    };
  }

  let result: Awaited<ReturnType<typeof deepgramTranscribeWithTimings>>;
  try {
    // Wrap the Node Buffer as a plain ArrayBuffer for the existing helper.
    // `Buffer.buffer` is typed as `ArrayBufferLike` (ArrayBuffer | SharedArrayBuffer)
    // in newer TS DOM libs; slice() narrows to a fresh ArrayBuffer.
    const underlying = audio.buffer.buffer as ArrayBuffer;
    const ab = underlying.slice(
      audio.buffer.byteOffset,
      audio.buffer.byteOffset + audio.buffer.byteLength,
    );
    result = await deepgramTranscribeWithTimings(
      ab,
      audio.contentType,
      audio.durationSec,
    );
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error(`[from-youtube] transcribe failed ytId=${ytId}:`, raw);
    return {
      kind: "fail",
      message: `Transcribe thất bại: ${raw}`,
    };
  }

  if (result.utterances.length === 0) {
    return { kind: "fail", message: "AI transcribe trả về rỗng." };
  }

  // Sanity-check the transcript is English.
  const sample = result.utterances
    .slice(0, 10)
    .map((u) => u.text)
    .join(" ");
  if (latinRatio(sample) < 0.6) {
    return {
      kind: "fail",
      message: "Audio transcribe ra không phải tiếng Anh — chọn video EN khác.",
    };
  }

  // Convert utterances to MergedSegment shape so we share the downstream
  // pipeline. Utterances are pause-delimited (can be too long), so re-run
  // them through our standard merger using each utterance as a "cue".
  const cues = result.utterances.map((u) => ({
    text: u.text,
    offsetSec: u.start,
    durationSec: Math.max(0.3, u.end - u.start),
  }));
  const merged = mergeCuesIntoSegments(cues, {
    targetSec: 6,
    maxSec: 12,
    gapSec: 1.5,
  });
  if (merged.length === 0) {
    return { kind: "fail", message: "Sau khi gộp transcript ra 0 đoạn." };
  }
  // Post-process: split long sentences at commas, fold lone interjections.
  const refined = refineSegmentsForShadowing(merged);
  return { kind: "ok", segments: refined, sttSource: result.source };
}

export async function POST(req: Request) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
      })
    : null;
  if (!me || !isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const ytId = extractYoutubeId(parsed.data.youtubeUrl);
  if (!ytId) {
    return NextResponse.json({ error: "URL YouTube không hợp lệ" }, { status: 400 });
  }

  // 0. Pull YouTube metadata FIRST so we can auto-fill missing title/source.
  //    Admin only has to paste the URL — we figure out the rest. If the
  //    metadata fetch itself fails (private video, region-block, etc.) we
  //    surface a clean error before burning Claude/Deepgram credits.
  let ytTitle = "";
  let ytChannel = "";
  try {
    const info = await getYouTubeBasicInfo(ytId);
    ytTitle = info.title;
    ytChannel = info.channelTitle ?? "";
    if (info.isLive) {
      return NextResponse.json(
        { error: "Video đang livestream — chọn video đã phát xong." },
        { status: 422 },
      );
    }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error(`[from-youtube] getBasicInfo failed ytId=${ytId}:`, raw);
    return NextResponse.json(
      {
        error:
          "Không lấy được thông tin video. " +
          (raw.toLowerCase().includes("private")
            ? "Video private."
            : raw.toLowerCase().includes("login")
              ? "Video bị age-gate hoặc yêu cầu đăng nhập."
              : "URL có hợp lệ không? Thử lại."),
      },
      { status: 422 },
    );
  }
  const finalTitle = (parsed.data.title?.trim() || ytTitle || `Video ${ytId}`).slice(0, 200);
  const finalSource = (parsed.data.source?.trim() || ytChannel || "YouTube").slice(0, 80);

  // 1. Captions path first — free + fast.
  let merged: MergedSegment[] = [];
  let method: "captions" | "audio" = "captions";
  let sttSource: "deepgram" | "groq-whisper" | null = null;

  const captionAttempt = await tryCaptions(ytId);
  if (captionAttempt.kind === "ok") {
    // Same refine pass as the audio path: comma-splits + interjection
    // merge make caption-based lessons drillable, not just transcribed.
    merged = refineSegmentsForShadowing(mergeCuesIntoSegments(captionAttempt.cues));
  }

  // 1b. Public transcript APIs FIRST — services like youtubetranscript.com
  //     maintain proxy pools + caches, so popular videos return instantly
  //     and even unpopular ones bypass YouTube's IP block. Most reliable
  //     path now that Invidious itself is partially blocked.
  let watchAvailableLangs: string[] | null = null;
  let watchErr: string | null = null;
  if (merged.length === 0) {
    try {
      const pubResult = await fetchYouTubeCaptionsViaPublicApi(ytId);
      watchAvailableLangs = pubResult.availableLangs;
      if (pubResult.cues.length > 0) {
        console.log(
          `[from-youtube] public-api captions rescued ytId=${ytId} cues=${pubResult.cues.length}`,
        );
        merged = refineSegmentsForShadowing(mergeCuesIntoSegments(pubResult.cues));
      }
    } catch (e) {
      watchErr = `public-api: ${e instanceof Error ? e.message : e}`;
      console.warn(`[from-youtube] public-api fail ytId=${ytId}: ${watchErr}`);
    }
  }

  // 1c. Invidious proxy path — public instances fetch via residential IPs.
  //     Many instances are now also blocked by YT but some still work
  //     intermittently, so worth trying as a fallback to public APIs.
  if (merged.length === 0) {
    try {
      const invResult = await fetchYouTubeCaptionsViaInvidious(ytId);
      if (!watchAvailableLangs?.length) watchAvailableLangs = invResult.availableLangs;
      if (invResult.cues.length > 0) {
        console.log(
          `[from-youtube] invidious captions rescued ytId=${ytId} cues=${invResult.cues.length}`,
        );
        merged = refineSegmentsForShadowing(mergeCuesIntoSegments(invResult.cues));
      }
    } catch (e) {
      const invErr = `invidious: ${e instanceof Error ? e.message : e}`;
      watchErr = watchErr ? `${watchErr} | ${invErr}` : invErr;
      console.warn(`[from-youtube] invidious captions fail ytId=${ytId}: ${invErr}`);
    }
  }

  // 1c. youtubei.js library — the library manages its own session/
  //     cookies/signature_timestamp and sometimes survives bot detection.
  if (merged.length === 0) {
    try {
      const libResult = await fetchYouTubeCaptionsViaLibrary(ytId);
      if (!watchAvailableLangs?.length) watchAvailableLangs = libResult.availableLangs;
      if (libResult.cues.length > 0) {
        console.log(
          `[from-youtube] library captions rescued ytId=${ytId} cues=${libResult.cues.length}`,
        );
        merged = refineSegmentsForShadowing(mergeCuesIntoSegments(libResult.cues));
      }
    } catch (e) {
      const libErr = `library: ${e instanceof Error ? e.message : e}`;
      watchErr = watchErr ? `${watchErr} | ${libErr}` : libErr;
      console.warn(`[from-youtube] library captions fail ytId=${ytId}: ${libErr}`);
    }
  }
  if (merged.length === 0) {
    try {
      const result = await fetchYouTubeCaptionsViaInnertube(ytId);
      if (!watchAvailableLangs?.length) watchAvailableLangs = result.availableLangs;
      if (result.cues.length > 0) {
        console.log(
          `[from-youtube] innertube-player captions rescued ytId=${ytId} cues=${result.cues.length}`,
        );
        merged = refineSegmentsForShadowing(mergeCuesIntoSegments(result.cues));
      } else if (result.availableLangs.length > 0) {
        // Captions exist but none are English. If admin disabled audio
        // fallback, surface a precise message before the generic flow does.
        const langsLower = result.availableLangs.map((l) => l.toLowerCase());
        const hasEN = langsLower.some((l) => l.startsWith("en"));
        if (!hasEN) {
          return NextResponse.json(
            {
              error:
                `Video chỉ có phụ đề: ${result.availableLangs.join(", ")} — ` +
                "module Shadowing yêu cầu video có nội dung tiếng Anh. " +
                "Chọn video khác hoặc dùng \"Chế độ nâng cao\" để dán transcript thủ công.",
            },
            { status: 422 },
          );
        }
      }
    } catch (e) {
      const innertubeErr = e instanceof Error ? e.message : String(e);
      watchErr = watchErr
        ? `${watchErr} | innertube: ${innertubeErr}`
        : `innertube: ${innertubeErr}`;
      console.warn(
        `[from-youtube] innertube-player captions fail ytId=${ytId}: ${innertubeErr}`,
      );
    }
  }

  // 2. Audio fallback — only if captions failed AND admin allowed it.
  if (merged.length === 0) {
    if (!parsed.data.allowAudioFallback) {
      const langsMsg =
        captionAttempt.kind === "fail" && captionAttempt.availableLangs.length > 0
          ? ` Track có sẵn: ${captionAttempt.availableLangs.join(", ")}.`
          : "";
      return NextResponse.json(
        {
          error:
            "Video không có phụ đề EN" +
            langsMsg +
            " và bạn đã tắt AI nghe fallback. Bật lại hoặc dán transcript thủ công.",
        },
        { status: 422 },
      );
    }
    method = "audio";
    const audioAttempt = await tryAudioTranscription(ytId);
    if (audioAttempt.kind === "fail") {
      const captionLangs =
        watchAvailableLangs?.length
          ? watchAvailableLangs
          : captionAttempt.kind === "fail"
            ? captionAttempt.availableLangs
            : [];
      const langsMsg = captionLangs.length > 0
        ? ` Captions có: ${captionLangs.join(", ")}.`
        : "";
      const watchMsg = watchErr ? ` (watch-page: ${watchErr})` : "";
      return NextResponse.json(
        {
          error:
            `Cả captions và AI nghe đều fail. ${audioAttempt.message}${langsMsg}${watchMsg} ` +
            `Phương án: 1) chọn video EN có phụ đề YouTube, 2) mở "Chế độ nâng cao — dán transcript thủ công" và paste VTT/SRT.`,
        },
        { status: 422 },
      );
    }
    merged = audioAttempt.segments;
    sttSource = audioAttempt.sttSource;
  }

  if (merged.length === 0) {
    return NextResponse.json(
      { error: "Không tạo ra được đoạn nào — kiểm tra lại video." },
      { status: 422 },
    );
  }

  // 3. Ask Claude for IPA + Vietnamese for every merged segment. Batch in
  //    chunks of 40 to keep each Claude call within max_tokens.
  const enriched = new Map<number, { ipa: string; textVi: string }>();
  const BATCH = 40;
  for (let i = 0; i < merged.length; i += BATCH) {
    const slice = merged.slice(i, i + BATCH);
    try {
      const items = await enrichShadowingSegments({
        segments: slice.map((s) => ({ textEn: s.textEn })),
      });
      for (const it of items) {
        const globalIdx = i + (it.index - 1);
        if (globalIdx >= 0 && globalIdx < merged.length) {
          enriched.set(globalIdx, { ipa: it.ipa || "", textVi: it.textVi || "" });
        }
      }
    } catch (e) {
      console.error(
        `[from-youtube] enrichShadowingSegments batch ${i}..${i + slice.length} failed ytId=${ytId}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  // 4. Persist. Truncate the resolved source field FIRST so the "· AI nghe"
  //    badge can never be the part that gets chopped off — admin can always
  //    tell at a glance which path produced the lesson.
  const sourceBadge =
    method === "audio"
      ? `${finalSource.slice(0, 70)} · AI nghe`
      : finalSource.slice(0, 80);

  let lesson;
  try {
    lesson = await prisma.shadowingLesson.create({
      data: {
        title: finalTitle,
        source: sourceBadge.slice(0, 80),
        youtubeId: ytId,
        thumbnailUrl: youtubeThumbnail(ytId),
        createdBy: null,
        published: true,
        segments: {
          create: merged.map((s, i) => {
            const en = enriched.get(i);
            return {
              order: i + 1,
              startSec: s.startSec,
              endSec: s.endSec,
              textEn: s.textEn,
              textVi: en?.textVi || null,
              ipa: en?.ipa || null,
            };
          }),
        },
      },
    });
  } catch (e) {
    console.error(
      `[from-youtube] DB write failed ytId=${ytId} method=${method} segments=${merged.length}:`,
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      {
        error:
          "Đã transcribe + dịch xong nhưng lưu DB lỗi. Thử lại — nếu lặp lại, kiểm tra log Railway.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: lesson.id,
    segmentCount: merged.length,
    enriched: enriched.size,
    method,
    sttSource,
    maxAudioMinutes: MAX_AUDIO_FALLBACK_SEC / 60,
  });
}
