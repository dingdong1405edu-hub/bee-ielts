import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isMusicScope } from "@/lib/music-scopes";

export const dynamic = "force-dynamic";

/**
 * Returns the active background music tracks for the requested scope.
 * Client picks one at random for the current page so the listening
 * experience varies. Returns `{ tracks: [] }` when no track is enabled
 * for the scope so the client can quietly do nothing.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  if (!isMusicScope(scope)) {
    return NextResponse.json({ tracks: [] });
  }

  const tracks = await prisma.backgroundMusic.findMany({
    where: { enabled: true, scopes: { has: scope } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, audioUrl: true, volume: true },
  });
  return NextResponse.json({ tracks });
}
