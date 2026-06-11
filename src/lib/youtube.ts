/**
 * YouTube URL helpers — extract the 11-character video id from any of the
 * URL shapes YouTube has shipped over the years, and compute the canonical
 * thumbnail URL for a given id. Used by the Shadowing module.
 *
 * Also includes server-side audio extraction via youtubei.js — used by the
 * shadowing audio fallback when a video has no English captions on YouTube.
 */
import { Innertube, UniversalCache, Utils } from "youtubei.js";
import { ProxyAgent } from "undici";

/**
 * Optional outbound proxy (residential / rotating) — set env YT_PROXY
 * (e.g. http://user:pass@host:port) to route every YouTube request through
 * an unblocked IP. This is the permanent fix for YouTube's datacenter-IP bot
 * block ("Sign in to confirm you're not a bot"). When unset, behaviour is
 * unchanged (a plain direct fetch).
 */
type YtProxyGlobal = typeof globalThis & { __beeYtProxy?: ProxyAgent | null };
function ytProxyDispatcher(): ProxyAgent | undefined {
  const url = process.env.YT_PROXY?.trim();
  if (!url) return undefined;
  const g = globalThis as YtProxyGlobal;
  if (g.__beeYtProxy === undefined) {
    try {
      g.__beeYtProxy = new ProxyAgent(url);
      console.log("[yt] routing YouTube traffic through YT_PROXY");
    } catch (e) {
      console.error("[yt] YT_PROXY invalid, ignoring:", e);
      g.__beeYtProxy = null;
    }
  }
  return g.__beeYtProxy ?? undefined;
}
/** fetch() that honours YT_PROXY when set — used for InnerTube + youtubei.js. */
function ytFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const dispatcher = ytProxyDispatcher();
  if (!dispatcher) return fetch(input, init);
  return fetch(input, { ...init, dispatcher } as RequestInit & { dispatcher: unknown });
}

/** Return the 11-char video id from a YouTube URL, or null if not found. */
export function extractYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // Bare id case — exactly 11 chars from the youtube alphabet.
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  // youtu.be short link: youtu.be/<id>?…
  const short = raw.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  // youtube.com watch / embed / shorts URLs.
  const watch = raw.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return watch[1];
  const embed = raw.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  if (embed) return embed[1];
  const shorts = raw.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  if (shorts) return shorts[1];
  return null;
}

/** Standard YouTube hqdefault thumbnail (480x360, always available). */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Embed URL for the IFrame Player API — enablejsapi so we can post-message it. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&controls=1`;
}

/**
 * Merge raw YouTube caption cues (each typically 2-3 words long) into
 * sentence-shaped shadowing segments. We greedy-pack cues until we hit a
 * terminal punctuation (.!?) OR the running window grows past `targetSec`
 * seconds OR we cross a long silence gap. Each merged segment carries a
 * single start (from the first cue) and end (last cue's start+duration).
 */
export interface RawCue {
  text: string;
  offsetSec: number;
  durationSec: number;
}
export interface MergedSegment {
  startSec: number;
  endSec: number;
  textEn: string;
}
export function mergeCuesIntoSegments(
  cues: RawCue[],
  opts: { targetSec?: number; maxSec?: number; gapSec?: number } = {},
): MergedSegment[] {
  // Tightened from 6/12 → 4/7. User feedback: "cho users nói ít thôi đừng
  // dài quá... nhưng vẫn phải giữ được đúng nhịp nói". Shorter chunks =
  // easier to mimic the speaker's rhythm. 4s ≈ 8-10 words at conversational
  // pace which lines up with the comfortable shadowing range.
  const targetSec = opts.targetSec ?? 4;
  const maxSec = opts.maxSec ?? 7;
  const gapSec = opts.gapSec ?? 1.2;
  const cleaned = cues
    .map((c) => ({
      ...c,
      text: c.text
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\[.*?\]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((c) => c.text.length > 0);

  const segments: MergedSegment[] = [];
  let bucket: RawCue[] = [];
  const flush = () => {
    if (bucket.length === 0) return;
    const startSec = bucket[0].offsetSec;
    const last = bucket[bucket.length - 1];
    const endSec = Math.max(startSec + 0.5, last.offsetSec + last.durationSec);
    const textEn = bucket
      .map((b) => b.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (textEn) segments.push({ startSec, endSec, textEn });
    bucket = [];
  };

  for (let i = 0; i < cleaned.length; i++) {
    const cur = cleaned[i];
    const prev = bucket[bucket.length - 1];
    if (prev) {
      const gap = cur.offsetSec - (prev.offsetSec + prev.durationSec);
      if (gap > gapSec) flush();
    }
    bucket.push(cur);
    const windowStart = bucket[0].offsetSec;
    const windowEnd = cur.offsetSec + cur.durationSec;
    const span = windowEnd - windowStart;
    const endsSentence = /[.!?]\s*$/.test(cur.text);
    if (endsSentence && span >= targetSec * 0.5) flush();
    else if (span >= maxSec) flush();
    else if (span >= targetSec && /[,;:]\s*$/.test(cur.text)) flush();
  }
  flush();
  return segments;
}

/** Standalone interjections that shouldn't form their own shadowing
 *  segment — too short to be a useful drill. When found as the WHOLE
 *  text of a segment they get merged into the next one (or the previous,
 *  if it's the final segment). When they appear inside a multi-word
 *  segment they're left alone — "Oh, I forgot" is a fine drill. */
const LONE_INTERJECTIONS = new Set([
  "hmm", "hmmm", "uhm", "umm", "ah", "ahh", "aw", "aww", "oh", "ohh", "uh",
  "uhh", "eh", "huh", "wow", "ouch", "ugh", "haha", "hehe", "oof", "phew",
  "yeah", "yep", "yup", "nope", "okay", "ok", "well", "so", "mmm", "mhm",
]);

function isLoneInterjection(text: string): boolean {
  const stripped = text
    .toLowerCase()
    .replace(/[.,!?;:"'()—–\-…]/g, "")
    .trim();
  if (!stripped) return true;
  // A segment is "lone" only when EVERY word is an interjection token.
  // "oh i forgot" → has "i" + "forgot" → not lone.
  const words = stripped.split(/\s+/);
  return words.length > 0 && words.every((w) => LONE_INTERJECTIONS.has(w));
}

/**
 * Post-process shadowing segments so each unit is comfortable to drill.
 * User feedback: "cho users nói ít thôi đừng dài quá thế này (nhưng vẫn
 * phải giữ được đúng nhịp nói)" → 3 passes:
 *
 * 1. SPLIT-ON-COMMA — if a segment contains internal commas / semicolons
 *    AND is >= 6 words OR >= 4s, break at those punctuation points. Each
 *    sub-segment gets a proportional time slice based on char count.
 *
 * 2. SPLIT-ON-CONJUNCTION — if a segment is STILL >= 9 words after pass 1
 *    (no comma to use), break before natural conjunctions (and / but / so
 *    / because / when / if / while). These are real prosodic boundaries
 *    in spoken English so cutting there preserves rhythm.
 *
 * 3. MERGE-LONE-INTERJECTION — segments that are just a filler word
 *    ("Hmm.", "Yeah.") merge into the NEXT (or previous, on trailing edge)
 *    so users don't shadow meaningless fillers.
 */
const CONJ_SPLIT_RE =
  /\s+(and|but|or|so|because|when|while|if|though|although|since|until|whereas|whether)\s+/i;

function splitAtConjunction(seg: MergedSegment): MergedSegment[] {
  const text = seg.textEn.trim();
  const m = text.match(CONJ_SPLIT_RE);
  if (!m || m.index == null) return [seg];
  // Split BEFORE the conjunction (it leads the next phrase: "I went home /
  // and rested" — the natural pause is before "and").
  const cut = m.index;
  const before = text.slice(0, cut).trim();
  const after = text.slice(cut + 1).trim(); // +1 to drop the leading space
  if (!before || !after) return [seg];
  // Time-slice proportional to char count.
  const span = seg.endSec - seg.startSec;
  const beforeFrac = before.length / (before.length + after.length);
  const splitSec = seg.startSec + span * beforeFrac;
  return [
    { startSec: seg.startSec, endSec: splitSec, textEn: before },
    { startSec: splitSec, endSec: seg.endSec, textEn: after },
  ];
}

export function refineSegmentsForShadowing(
  segments: MergedSegment[],
): MergedSegment[] {
  // --- 1) Split on internal commas / semicolons. Thresholds dropped from
  //        9 words / 6s → 6 words / 4s so even modest-length segments with
  //        natural pauses get broken into bite-size drills.
  const splitOpen: MergedSegment[] = [];
  for (const seg of segments) {
    const text = seg.textEn.trim();
    const words = text.split(/\s+/).length;
    const span = seg.endSec - seg.startSec;
    const hasInternalComma = /[,;]\s+\S/.test(text);
    if (!hasInternalComma || (words < 6 && span < 4)) {
      splitOpen.push(seg);
      continue;
    }
    const pieces = text.match(/[^,;]+[,;]?(\s|$)/g);
    if (!pieces || pieces.length < 2) {
      splitOpen.push(seg);
      continue;
    }
    const cleanedPieces = pieces
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (cleanedPieces.length < 2) {
      splitOpen.push(seg);
      continue;
    }
    const totalChars = cleanedPieces.reduce((s, p) => s + p.length, 0);
    let t = seg.startSec;
    cleanedPieces.forEach((p, idx) => {
      const frac = p.length / totalChars;
      const dur = span * frac;
      const startSec = t;
      const endSec = idx === cleanedPieces.length - 1 ? seg.endSec : t + dur;
      t = endSec;
      splitOpen.push({ startSec, endSec, textEn: p });
    });
  }

  // --- 1b) Split-on-conjunction for STILL-long segments (no comma to
  //        use). Applied recursively so a 20-word run with two
  //        conjunctions gets broken into 3 chunks.
  const conjunctionSplit: MergedSegment[] = [];
  for (const seg of splitOpen) {
    const words = seg.textEn.split(/\s+/).length;
    if (words < 9) {
      conjunctionSplit.push(seg);
      continue;
    }
    // Iteratively split until each piece is <9 words OR no conjunction left.
    const queue: MergedSegment[] = [seg];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curWords = cur.textEn.split(/\s+/).length;
      if (curWords < 9) {
        conjunctionSplit.push(cur);
        continue;
      }
      const parts = splitAtConjunction(cur);
      if (parts.length === 1) {
        // No conjunction → keep as-is even if long.
        conjunctionSplit.push(cur);
      } else {
        // Push parts back so they're re-checked (handles 2+ conjunctions).
        queue.unshift(...parts);
      }
    }
  }
  const splitOpenFinal = conjunctionSplit;

  // --- 3) Merge any segment that is JUST an interjection. ---
  // pendingFiller is LOCAL — never put state at module scope inside an
  // async server route. Two admin requests in parallel would collide.
  const refined: MergedSegment[] = [];
  const pendingFiller: MergedSegment[] = [];
  for (let idx = 0; idx < splitOpenFinal.length; idx++) {
    const seg = splitOpenFinal[idx];
    const isLast = idx === splitOpenFinal.length - 1;
    if (isLoneInterjection(seg.textEn) && !isLast) {
      pendingFiller.push(seg);
      continue;
    }
    if (pendingFiller.length > 0) {
      const head = pendingFiller[0];
      const text = `${pendingFiller.map((p) => p.textEn).join(" ")} ${seg.textEn}`.trim();
      refined.push({
        startSec: head.startSec,
        endSec: seg.endSec,
        textEn: text,
      });
      pendingFiller.length = 0;
    } else {
      refined.push(seg);
    }
  }
  // If we ended with leftover interjections (last segment WAS an
  // interjection), fold them into the previous real segment so the drill
  // text isn't a meaningless filler.
  if (pendingFiller.length > 0 && refined.length > 0) {
    const last = refined[refined.length - 1];
    const tail = pendingFiller.map((p) => p.textEn).join(" ");
    refined[refined.length - 1] = {
      startSec: last.startSec,
      endSec: pendingFiller[pendingFiller.length - 1].endSec,
      textEn: `${last.textEn} ${tail}`.trim(),
    };
  }

  return refined;
}

/**
 * youtubei.js — server-side audio fetcher used by the "AI nghe & tạo bài"
 * fallback when a video has no English captions. Singleton client is
 * cheaper (~200ms session init / call avoided) than creating one per
 * request. UniversalCache(false) = in-memory only — fine for Railway.
 *
 * IOS client choice: it's the variant least likely to require a PO token
 * on fresh server IPs. ANDROID would also work; WEB requires a token.
 *
 * HMR safety: in dev, Next.js re-evaluates this module on every code
 * change. A naive `let innertubeSingleton: Innertube | null = null;` at
 * module scope leaks: each HMR cycle creates a fresh session, never GCs
 * the old ones, and a long dev session can stack 50+ Innertube instances
 * holding network sockets. Stash on globalThis (same trick the Prisma
 * singleton uses) so HMR finds the live instance instead of recreating it.
 */
type InnertubeGlobal = typeof globalThis & {
  __beeInnertube?: Innertube;
  __beeInnertubePromise?: Promise<Innertube>;
};
async function getInnertube(): Promise<Innertube> {
  const g = globalThis as InnertubeGlobal;
  if (g.__beeInnertube) return g.__beeInnertube;
  // Concurrent callers must share the same in-flight create() promise or
  // we'd init twice on the very first burst of requests.
  if (g.__beeInnertubePromise) return g.__beeInnertubePromise;
  // generate_session_locally=true matches the original working config (commit
  // 510d5f0 era). Toggling it OFF — to "pull real session from YouTube" —
  // turned out to cause regressions on Railway IPs because the remote
  // session fetch returns a visitor_data that some clients then reject as
  // mismatched. Local session is what was shipping when this admin's
  // videos uploaded successfully, so keep it.
  // Optional auth env vars are still honoured if the admin chooses to set
  // them (paste cookie / po_token from a logged-in browser):
  const cookie = process.env.YT_COOKIE?.trim() || undefined;
  const visitor_data = process.env.YT_VISITOR_DATA?.trim() || undefined;
  const po_token = process.env.YT_PO_TOKEN?.trim() || undefined;
  if (cookie) console.log("[yt-init] using YT_COOKIE (authenticated session)");
  if (po_token) console.log("[yt-init] using YT_PO_TOKEN");
  if (visitor_data) console.log("[yt-init] using YT_VISITOR_DATA");
  g.__beeInnertubePromise = Innertube.create({
    cache: new UniversalCache(false),
    generate_session_locally: true,
    fetch: ytFetch,
    ...(cookie ? { cookie } : {}),
    ...(visitor_data ? { visitor_data } : {}),
    ...(po_token ? { po_token } : {}),
  }).then((c) => {
    g.__beeInnertube = c;
    return c;
  });
  return g.__beeInnertubePromise;
}

/** Lightweight metadata for a video — used to reject livestreams and to
 *  cap duration before we burn API credits on a 3-hour podcast. */
export interface YouTubeBasicInfo {
  videoId: string;
  title: string;
  durationSec: number;
  isLive: boolean;
  channelTitle: string | null;
}

/** Best-effort duration resolution. `basic_info.duration` is the canonical
 *  field but youtubei.js returns 0/undefined for it on a non-trivial slice
 *  of valid videos (player response shape varies by region / client / day).
 *  Every adaptive format carries `approx_duration_ms`, which is always
 *  populated when the video has any playable stream — fall back to that. */
function resolveDuration(info: {
  basic_info: { duration?: number | null };
  streaming_data?: {
    adaptive_formats?: { approx_duration_ms?: number | string }[];
    formats?: { approx_duration_ms?: number | string }[];
  } | null;
}): number {
  const d1 = info.basic_info.duration ?? 0;
  if (d1 > 0) return d1;
  const fromAdaptive = info.streaming_data?.adaptive_formats
    ?.map((f) => Number(f.approx_duration_ms ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0) ?? [];
  const fromMuxed = info.streaming_data?.formats
    ?.map((f) => Number(f.approx_duration_ms ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0) ?? [];
  const candidates = [...fromAdaptive, ...fromMuxed];
  if (candidates.length === 0) return 0;
  return Math.max(...candidates) / 1000;
}

/**
 * Pull caption cues via the InnerTube /player endpoint (ANDROID client).
 *
 * Why this is the canonical path now: YouTube's web page returns different
 * HTML to server IPs (often consent walls, "video unavailable" stubs, or
 * pages stripped of `captionTracks`). The watch-page scrape worked locally
 * but returned empty captionTracks from Railway. The InnerTube API, by
 * contrast, treats the ANDROID youtubei client as a first-class consumer
 * and returns full player + captions data regardless of region/IP — this
 * is the same path the `youtube-transcript` library uses internally when
 * it works.
 *
 * Two more crucial details vs the previous attempt:
 *   1. The signed `baseUrl` we get back MUST be fetched RAW — adding
 *      `&fmt=json3` (or anything else) invalidates the signature and
 *      YouTube returns 200 with empty body. So we accept the default
 *      srv3 XML payload (`<p t="ms" d="ms">text</p>`) and parse that.
 *   2. The XML format here is srv3-style `<p>` elements (different from
 *      youtube-transcript's classic `<text>` format) — our parser handles
 *      both shapes so we don't break if YouTube flips the default again.
 *
 * Returns `availableLangs` so callers can early-reject videos that have
 * captions but not in English (typical for Vietnamese-only vlogs).
 * Throws ONLY for hard failures (no tracks at all, fetch errors).
 */
export async function fetchYouTubeCaptionsViaInnertube(
  videoId: string,
): Promise<{ cues: RawCue[]; availableLangs: string[] }> {
  const innertubeUrl =
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
  // Honor YT_COOKIE — Railway admin can paste their logged-in browser
  // cookie via env var to bypass LOGIN_REQUIRED / "Sign in to confirm
  // you're not a bot". This is the documented escape hatch for IPs that
  // YouTube has flagged.
  const cookie = process.env.YT_COOKIE?.trim();
  if (cookie) console.log("[yt-captions] using YT_COOKIE");

  // Try multiple ANDROID client versions. YouTube rolls bot detection
  // forward against specific versions; rotating among 3 recent ones
  // catches the window between roll-outs.
  const CLIENTS: Array<{
    name: string;
    body: Record<string, unknown>;
    userAgent: string;
  }> = [
    {
      name: "IOS 19.45.4",
      userAgent:
        "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)",
      body: {
        context: {
          client: {
            clientName: "IOS",
            clientVersion: "19.45.4",
            deviceModel: "iPhone16,2",
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      },
    },
    {
      name: "ANDROID 20.10.38",
      userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
      body: {
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
            androidSdkVersion: 34,
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      },
    },
    {
      name: "ANDROID 19.09.37",
      userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 14)",
      body: {
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.09.37",
            androidSdkVersion: 34,
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      },
    },
    {
      name: "WEB+CONSENT",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      body: {
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250101.00.00",
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      },
    },
    {
      name: "TVHTML5",
      userAgent:
        "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko)",
      body: {
        context: {
          client: {
            clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
            clientVersion: "2.0",
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      },
    },
  ];

  type PlayerResponse = {
    playabilityStatus?: { status?: string; reason?: string };
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: Array<{
          baseUrl: string;
          languageCode?: string;
          vssId?: string;
          kind?: string;
        }>;
      };
    };
  };

  let data: PlayerResponse | null = null;
  let usedClient: (typeof CLIENTS)[number] | null = null;
  const attempts: string[] = [];
  for (const client of CLIENTS) {
    const r = await ytFetch(innertubeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        ...(cookie ? { Cookie: cookie } : { Cookie: "CONSENT=YES+cb" }),
      },
      body: JSON.stringify(client.body),
    });
    if (!r.ok) {
      attempts.push(`${client.name}: HTTP ${r.status}`);
      continue;
    }
    const parsed = (await r.json()) as PlayerResponse;
    const status = parsed.playabilityStatus?.status?.toUpperCase();
    if (!status || status === "OK") {
      data = parsed;
      usedClient = client;
      break;
    }
    attempts.push(
      `${client.name}: ${status} ${parsed.playabilityStatus?.reason ?? ""}`.trim(),
    );
  }
  if (!data || !usedClient) {
    throw new Error(
      `Tất cả ${CLIENTS.length} client InnerTube fail: ${attempts.join(" | ")}` +
        (cookie
          ? ""
          : ". Nếu IP server bị YT chặn: set env var YT_COOKIE = giá trị cookie header từ trình duyệt logged-in."),
    );
  }
  if (usedClient.name !== "ANDROID 20.10.38") {
    console.log(`[yt-captions] fallback ${usedClient.name} succeeded for ${videoId}`);
  }
  const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const availableLangs = tracks
    .map((t) => t.languageCode || t.vssId || "?")
    .filter(Boolean);
  if (tracks.length === 0) {
    throw new Error("Video không có phụ đề YouTube nào.");
  }
  // Prefer manual EN, fallback to any en-* variant, then auto-generated "a.en"
  // or a track with kind:"asr" (auto-speech-recognition).
  const enTrack =
    tracks.find((t) => t.vssId === ".en") ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks.find((t) => t.vssId === "a.en");
  if (!enTrack) {
    return { cues: [], availableLangs };
  }
  // CRITICAL: fetch baseUrl RAW. Appending fmt=json3 or similar invalidates
  // the signed signature and YouTube returns 200 with size=0.
  const capResp = await ytFetch(enTrack.baseUrl, {
    headers: {
      "User-Agent": usedClient.userAgent,
      ...(cookie ? { Cookie: cookie } : { Cookie: "CONSENT=YES+cb" }),
    },
  });
  if (!capResp.ok) {
    throw new Error(
      `Caption fetch HTTP ${capResp.status} cho lang=${enTrack.languageCode}`,
    );
  }
  const body = await capResp.text();
  if (!body.trim()) {
    throw new Error(
      `Caption body rỗng (lang=${enTrack.languageCode}) — IP server có thể bị YouTube rate-limit.`,
    );
  }
  const cues = parseSrv3OrClassicXml(body);
  if (cues.length === 0) {
    throw new Error("Caption parse ra 0 cue — format XML không nhận diện được.");
  }
  return { cues, availableLangs };
}

/** Parse YouTube's srv3 XML format <p t="ms" d="ms">text</p> AND the
 *  legacy classic format <text start="s" dur="s">text</text>. YouTube
 *  flips between these depending on client/version/day, so we accept
 *  both. Returns RawCue[] using seconds for offsets. */
function parseSrv3OrClassicXml(xml: string): RawCue[] {
  const decode = (s: string) =>
    s
      .replace(/<[^>]+>/g, "") // strip inner <s> word-level tags
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(parseInt(n, 10)));
  const cues: RawCue[] = [];
  // srv3 format: <p t="3378" d="3003">Hold your breath...</p>
  const pRe = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(xml)) !== null) {
    const text = decode(m[3]).trim();
    if (!text) continue;
    cues.push({
      text,
      offsetSec: parseInt(m[1], 10) / 1000,
      durationSec: Math.max(0.3, parseInt(m[2], 10) / 1000),
    });
  }
  if (cues.length > 0) return cues;
  // Classic format: <text start="3.378" dur="3.003">Hold your breath...</text>
  const tRe = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  while ((m = tRe.exec(xml)) !== null) {
    const text = decode(m[3]).trim();
    if (!text) continue;
    cues.push({
      text,
      offsetSec: parseFloat(m[1]),
      durationSec: Math.max(0.3, parseFloat(m[2])),
    });
  }
  return cues;
}

export async function getYouTubeBasicInfo(videoId: string): Promise<YouTubeBasicInfo> {
  // Reverted to the 510d5f0 shape (the version that was uploading this
  // admin's videos successfully) — no per-call client option, no
  // multi-client retry loop. Let youtubei.js use the session default.
  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);
  const basic = info.basic_info;
  return {
    videoId,
    title: basic.title ?? "",
    durationSec: resolveDuration(info),
    isLive: !!basic.is_live,
    channelTitle: basic.author ?? null,
  };
}

// MAX_AUDIO_FALLBACK_SEC lives in shadowing-constants.ts so client
// components can use it without dragging youtubei.js into the browser
// bundle. Re-exported here as a convenience for server-side callers
// that already imported from this file.
export { MAX_AUDIO_FALLBACK_SEC } from "./shadowing-constants";
import { MAX_AUDIO_FALLBACK_SEC } from "./shadowing-constants";

/**
 * Download an audio-only track and return it as a Buffer. WebM/Opus by
 * default (~1 MB / min), which Deepgram accepts natively when we send
 * `Content-Type: audio/webm`.
 *
 * Throws if the video is a livestream, age-restricted (LOGIN_REQUIRED),
 * region-locked, or longer than MAX_AUDIO_FALLBACK_SEC.
 */
export interface YouTubeAudio {
  buffer: Buffer;
  contentType: string;
  durationSec: number;
  title: string;
}
export async function getYouTubeAudioBuffer(videoId: string): Promise<YouTubeAudio> {
  // Reverted to the 510d5f0 shape — single yt.getBasicInfo() call (no
  // per-call client override) + IOS client for the audio download itself.
  // That combination was uploading this admin's videos successfully; the
  // multi-client retry + ensurePlayable layers I added in 48d4ffb / 1249be7
  // / a73a464 introduced regressions on otherwise-fine videos.
  const yt = await getInnertube();
  const info = await yt.getBasicInfo(videoId);
  if (info.basic_info.is_live) {
    throw new Error("Video đang livestream — không tải audio được.");
  }
  const dur = resolveDuration(info);
  if (dur > 0 && dur > MAX_AUDIO_FALLBACK_SEC) {
    throw new Error(
      `Video dài ${Math.round(dur / 60)} phút, vượt giới hạn ${MAX_AUDIO_FALLBACK_SEC / 60} phút cho AI nghe.`,
    );
  }
  if (dur === 0) {
    console.warn(
      `[yt-audio] duration unknown for ${videoId} — relying on streaming size guard.`,
    );
  }
  // Try IOS first (was the working client at 510d5f0 era). If it errors
  // with "Video is unplayable" — which started happening on June 10 for
  // videos that worked the day before — fall through to TV_EMBEDDED which
  // bypasses most embed-only / playability-flagged content. ANY other
  // error bubbles up unchanged (so private/region-block don't burn the
  // retry budget).
  const HARD_CAP_BYTES = 45 * 1024 * 1024;
  const downloadWith = async (
    client: "IOS" | "TV_EMBEDDED",
  ): Promise<Buffer> => {
    const stream = await yt.download(videoId, {
      type: "audio",
      quality: "best",
      format: "any",
      client,
    });
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of Utils.streamToIterable(stream)) {
      total += chunk.byteLength;
      if (total > HARD_CAP_BYTES) {
        throw new Error(
          `Audio vượt ${Math.round(HARD_CAP_BYTES / 1024 / 1024)}MB — video quá dài cho AI nghe (~> 45 phút).`,
        );
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  };
  // Trigger fallback on any client-side bot-detection signal — not just
  // "unplayable". login_required / po_token / 403 / sign-in all mean
  // "YouTube is blocking THIS client, try another". TV_EMBEDDED bypasses
  // most of these. Truly broken videos (private, region-block, deleted)
  // still bubble up because their messages don't match.
  const isClientBlockedError = (e: unknown) => {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    return (
      msg.includes("unplayable") ||
      msg.includes("playability") ||
      msg.includes("login_required") ||
      msg.includes("login required") ||
      msg.includes("sign in") ||
      msg.includes("po_token") ||
      msg.includes("po token") ||
      msg.includes("403") ||
      msg.includes("forbidden")
    );
  };
  let buffer: Buffer;
  try {
    buffer = await downloadWith("IOS");
  } catch (iosErr) {
    if (!isClientBlockedError(iosErr)) throw iosErr;
    console.warn(
      `[yt-audio] IOS blocked for ${videoId} (${iosErr instanceof Error ? iosErr.message : iosErr}), retrying with TV_EMBEDDED`,
    );
    buffer = await downloadWith("TV_EMBEDDED");
  }
  const finalDur = dur > 0 ? dur : Math.max(1, buffer.byteLength / 16000);
  return {
    buffer,
    contentType: "audio/webm",
    durationSec: finalDur,
    title: info.basic_info.title ?? "",
  };
}
