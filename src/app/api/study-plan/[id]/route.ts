import { NextResponse } from "next/server";
import { z } from "zod";
import { Skill } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const patchSchema = z.object({
  date: z.string().regex(dateRe).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  skill: z.nativeEnum(Skill).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  done: z.boolean().optional(),
});

async function requireOwned(id: string, userId: string) {
  const entry = await prisma.studyPlanEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== userId) return null;
  return entry;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await requireOwned(id, session.user.id);
  if (!owned) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.date) data.date = new Date(`${parsed.data.date}T00:00:00`);
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.skill !== undefined) data.skill = parsed.data.skill;
  if (parsed.data.note !== undefined) data.note = parsed.data.note;
  if (parsed.data.done !== undefined) data.done = parsed.data.done;

  const entry = await prisma.studyPlanEntry.update({ where: { id }, data });
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await requireOwned(id, session.user.id);
  if (!owned) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  await prisma.studyPlanEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
