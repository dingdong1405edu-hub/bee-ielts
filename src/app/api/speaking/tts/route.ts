import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deepgramSpeak } from "@/lib/deepgram";
import { DEFAULT_VOICE, isValidVoice } from "@/lib/tts-voices";

// Known-good Deepgram voice used as a last-ditch fallback. Asteria is the
// original Aura-1 voice that has been live since launch — if even the
// requested Aura-2 voice fails (e.g. Deepgram briefly drops a model), we
// keep examiner audio in the same Deepgram family rather than collapsing
// to the candidate's local browser TTS (which sounds completely different).
const SAFE_FALLBACK_VOICE = "aura-asteria-en";

/** Text-to-speech proxy — returns MP3 audio for the given text + chosen voice.
 *  Retry strategy: requested voice → safe Deepgram voice. Never returns a
 *  non-Deepgram source, so the examiner voice is consistent everywhere. */
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

  const tries: string[] = [voice];
  if (voice !== SAFE_FALLBACK_VOICE) tries.push(SAFE_FALLBACK_VOICE);

  let lastErr: unknown = null;
  for (const v of tries) {
    try {
      const audio = await deepgramSpeak(text, v);
      // Surface which voice actually played so the client can log it for
      // debugging without breaking the audio response.
      return new NextResponse(audio, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-Tts-Voice": v,
        },
      });
    } catch (e) {
      lastErr = e;
      console.error(`[speaking/tts] voice=${v} failed:`, e);
    }
  }
  return NextResponse.json(
    { error: `TTS thất bại: ${lastErr instanceof Error ? lastErr.message : "unknown"}` },
    { status: 502 },
  );
}

export const maxDuration = 30;
