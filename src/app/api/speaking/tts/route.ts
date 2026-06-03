import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Speaking TTS proxy — forwards to the user's hosted Aurora voice endpoint.
 *
 * Deepgram Aura was rejected by the user as too AI-sounding. The chosen
 * upstream is a custom Aurora service the user runs themselves on Railway;
 * it returns mp3 audio for a `text` query param. The `voice` body field is
 * preserved for backwards compatibility but ignored — Aurora is the only
 * voice now. URL-encoded GET keeps the upstream contract dead-simple; we
 * cap text at 1800 chars to stay under common URL-length limits.
 */
const AURORA_ENDPOINT = "https://file-nghe-production.up.railway.app/api/say/aurora";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });

  const capped = text.slice(0, 1800);
  const url = `${AURORA_ENDPOINT}?text=${encodeURIComponent(capped)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const upstreamBody = await res.text().catch(() => "");
      console.error(
        `[speaking/tts] Aurora upstream ${res.status}: ${upstreamBody.slice(0, 300)}`,
      );
      return NextResponse.json(
        { error: `TTS thất bại (${res.status})` },
        { status: 502 },
      );
    }
    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Tts-Voice": "aurora",
      },
    });
  } catch (e) {
    console.error("[speaking/tts] Aurora threw:", e);
    return NextResponse.json({ error: "TTS thất bại" }, { status: 502 });
  }
}

export const maxDuration = 30;
