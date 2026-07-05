/**
 * POST /api/onboarding/role — the user picks their persona on /welcome.
 *
 * Body: { role: "LEARNER" | "PARENT" | "TEACHER" }
 *   - "Học sinh" → LEARNER (the learner app, premium & payments all assume
 *     LEARNER; a student is just a LEARNER enrolled in a class).
 *   - "Phụ huynh" → PARENT, "Giáo viên" → TEACHER.
 * Always stamps onboardedAt so the welcome screen isn't shown again. Never
 * downgrades an existing ADMIN/OWNER — they just get marked onboarded.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ role: z.enum(["LEARNER", "PARENT", "TEACHER"]) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const keepRole = me.role === "ADMIN" || me.role === "OWNER";
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date(), ...(keepRole ? {} : { role: parsed.data.role }) },
  });

  return NextResponse.json({ ok: true, role: keepRole ? me.role : parsed.data.role });
}
