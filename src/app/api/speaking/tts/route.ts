import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deepgramSpeak } from "@/lib/deepgram";
import { DEFAULT_VOICE, isValidVoice } from "@/lib/tts-voices";

/** Text-to-speech proxy — returns MP3 audio for the given text + chosen voice. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let text = "";
  let voice = DEFAULT_VOICE;
  try {
    const body = (await req.json()) as { text?: string; voice?: string };
    text = (body.text ?? "").trim();
    if (isValidVoice(body.voice)) voice = body.voice;
  } catch {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });

  try {
    const audio = await deepgramSpeak(text, voice);
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[speaking/tts]", e);
    return NextResponse.json({ error: "TTS thất bại" }, { status: 502 });
  }
}

export const maxDuration = 30;
