import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deepgramTranscribe } from "@/lib/deepgram";

/**
 * Transcribe a recorded audio clip with Deepgram.
 * Body: raw audio bytes; the Content-Type header carries the audio mime type.
 * Returns { transcript, words: [{ word, confidence }] }.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Keep the codec parameter — Deepgram actually USES it to pick the right
  // demuxer. Stripping it earlier was a misdiagnosis. The raw header from
  // the browser is the most accurate description of the bytes.
  const rawCt = req.headers.get("content-type") || "audio/webm";
  const audio = await req.arrayBuffer();
  console.log(
    `[transcribe] received content-type="${rawCt}" bytes=${audio.byteLength}`,
  );
  if (audio.byteLength < 1000) {
    return NextResponse.json({ error: "Bản ghi quá ngắn" }, { status: 400 });
  }
  if (audio.byteLength > 12_000_000) {
    return NextResponse.json({ error: "Bản ghi quá lớn" }, { status: 413 });
  }

  try {
    // keepFillers=true: preserve "um"/"uh"/"mm" so the examiner can flag
    // hesitation and score Fluency & Coherence on real disfluency evidence.
    const result = await deepgramTranscribe(audio, rawCt, undefined, false, true);
    return NextResponse.json(result);
  } catch (e) {
    // Keep the raw detail in server logs for debugging but don't surface
    // 401 / API-key payloads to the candidate — the message they see should
    // be actionable, not a stack trace.
    console.error("[speaking/transcribe]", e);
    return NextResponse.json(
      {
        error:
          "Hệ thống nhận dạng giọng nói tạm thời gián đoạn. Hãy thử ghi âm lại — nói to và rõ hơn.",
      },
      { status: 502 },
    );
  }
}

export const maxDuration = 60;
