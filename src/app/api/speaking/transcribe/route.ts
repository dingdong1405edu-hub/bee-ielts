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

  // Strip any codec parameter — `audio/webm;codecs=opus` confuses Deepgram's
  // demuxer in some cases; the base mime is enough.
  const rawCt = req.headers.get("content-type") || "audio/webm";
  const contentType = rawCt.split(";")[0].trim() || "audio/webm";
  const audio = await req.arrayBuffer();
  if (audio.byteLength < 1000) {
    return NextResponse.json({ error: "Bản ghi quá ngắn" }, { status: 400 });
  }
  if (audio.byteLength > 12_000_000) {
    return NextResponse.json({ error: "Bản ghi quá lớn" }, { status: 413 });
  }

  try {
    const result = await deepgramTranscribe(audio, contentType);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[speaking/transcribe]", e);
    // Surface the underlying Deepgram message so the client toast tells the
    // user (and us) what actually went wrong, instead of a generic message.
    const detail = e instanceof Error ? e.message : "Lỗi không xác định";
    return NextResponse.json(
      { error: `Không nhận dạng được giọng nói: ${detail}` },
      { status: 502 },
    );
  }
}

export const maxDuration = 60;
