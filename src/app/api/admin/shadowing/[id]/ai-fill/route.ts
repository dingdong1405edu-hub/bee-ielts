import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { enrichShadowingSegments, fixShadowingSegments } from "@/lib/claude";

/**
 * POST /api/admin/shadowing/[id]/ai-fill
 *
 * Two modes:
 *
 * - mode: "fill" (default) — keeps textEn as-is, returns ipa + textVi.
 *   Use after admin manually edited textEn and wants AI to refresh the
 *   secondary fields.
 *
 * - mode: "fix" — Claude ALSO cleans textEn (capitalization, punctuation,
 *   obvious Whisper homophones like "your/you're"), then returns the
 *   cleaned textEn together with ipa + textVi. Use when the segments came
 *   from STT and the English itself is messy.
 *
 * Stateless: the client sends the rows it wants processed (with a stable
 * `key` so we can match the response back), we never read or write segments
 * here. The edit page applies the result to local state and saves it later
 * through the PATCH endpoint.
 */
const bodySchema = z.object({
  mode: z.enum(["fill", "fix"]).optional().default("fill"),
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

export const maxDuration = 120;

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
    if (parsed.data.mode === "fix") {
      const fixed = await fixShadowingSegments({
        segments: parsed.data.items.map((x) => ({ textEn: x.textEn })),
      });
      const items = parsed.data.items.map((x, i) => {
        const match = fixed.find((e) => e.index === i + 1);
        return {
          key: x.key,
          textEn: match?.textEn ?? x.textEn,
          ipa: match?.ipa ?? "",
          textVi: match?.textVi ?? "",
        };
      });
      return NextResponse.json({ items, mode: "fix" });
    }

    const enriched = await enrichShadowingSegments({
      segments: parsed.data.items.map((x) => ({ textEn: x.textEn })),
    });
    const items = parsed.data.items.map((x, i) => {
      const match = enriched.find((e) => e.index === i + 1);
      return {
        key: x.key,
        textEn: x.textEn,
        ipa: match?.ipa ?? "",
        textVi: match?.textVi ?? "",
      };
    });
    return NextResponse.json({ items, mode: "fill" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI lỗi" },
      { status: 502 },
    );
  }
}
