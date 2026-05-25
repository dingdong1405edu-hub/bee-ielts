import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BAND_STAGE_DEFAULTS } from "@/lib/band-climber-defaults";

/**
 * Idempotent: creates any of the three default Vượt Band stages that don't
 * already exist (matched on (fromBand, toBand)). Lets admin populate the
 * feature with a single click instead of pasting markdown by hand.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let created = 0;
  let skipped = 0;
  for (const d of BAND_STAGE_DEFAULTS) {
    const exists = await prisma.bandStage.findUnique({
      where: { fromBand_toBand: { fromBand: d.fromBand, toBand: d.toBand } },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.bandStage.create({ data: d });
    created++;
  }
  return NextResponse.json({ created, skipped });
}
