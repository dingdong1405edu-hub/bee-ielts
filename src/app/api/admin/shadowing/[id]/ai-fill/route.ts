import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { enrichShadowingSegments } from "@/lib/claude";

/**
 * POST /api/admin/shadowing/[id]/ai-fill
 *
 * Re-runs Claude on a subset of segments to refresh IPA + Vietnamese after
 * the admin edits the English text. Stateless: the client sends the rows it
 * wants filled (with a stable `key` so we can match the response back),
 * we never read or write segments here. The edit page applies the result
 * to local state and saves it later through the PATCH endpoint.
 */
const bodySchema = z.object({
  items: z
    .array(
      z.object({
        key: z.string().min(1),
        textEn: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(60),
});

export const maxDuration = 90;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;
  if (!me || !isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const lesson = await prisma.shadowingLesson.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const enriched = await enrichShadowingSegments({
      segments: parsed.data.items.map((x) => ({ textEn: x.textEn })),
    });
    const items = parsed.data.items.map((x, i) => {
      const match = enriched.find((e) => e.index === i + 1);
      return {
        key: x.key,
        ipa: match?.ipa ?? "",
        textVi: match?.textVi ?? "",
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI lỗi" },
      { status: 502 },
    );
  }
}
