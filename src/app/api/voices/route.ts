import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public list of examiner voices for the Speaking voice picker. Only
 *  `enabled` voices are returned, ordered by the admin-set `order` field.
 *  Falls back to a hard-coded list if the DB is unreachable so the picker
 *  never breaks. */
const HARDCODED_FALLBACK = [
  { id: "fb-aurora", voiceId: "aura-2-aurora-en", name: "Aurora", accent: "Anh - Mỹ", gender: "Nữ", isDefault: true },
  { id: "fb-asteria", voiceId: "aura-asteria-en", name: "Asteria", accent: "Anh - Mỹ", gender: "Nữ", isDefault: false },
];

export async function GET() {
  try {
    const voices = await prisma.speakingVoice.findMany({
      where: { enabled: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        voiceId: true,
        name: true,
        accent: true,
        gender: true,
        isDefault: true,
      },
    });
    if (voices.length === 0) {
      return NextResponse.json({ voices: HARDCODED_FALLBACK });
    }
    return NextResponse.json({ voices });
  } catch (e) {
    console.error("[api/voices]", e);
    return NextResponse.json({ voices: HARDCODED_FALLBACK });
  }
}
