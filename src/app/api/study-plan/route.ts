import { NextResponse } from "next/server";
import { z } from "zod";
import { Skill } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  date: z.string().regex(dateRe),
  title: z.string().trim().min(1).max(120),
  skill: z.nativeEnum(Skill).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

const listSchema = z.object({
  from: z.string().regex(dateRe),
  to: z.string().regex(dateRe),
});

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listSchema.safeParse({ from: url.searchParams.get("from"), to: url.searchParams.get("to") });
  if (!parsed.success) return NextResponse.json({ error: "Khoảng ngày không hợp lệ" }, { status: 400 });

  const entries = await prisma.studyPlanEntry.findMany({
    where: {
      userId: session.user.id,
      date: { gte: parseDate(parsed.data.from), lte: parseDate(parsed.data.to) },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const entry = await prisma.studyPlanEntry.create({
    data: {
      userId: session.user.id,
      date: parseDate(parsed.data.date),
      title: parsed.data.title,
      skill: parsed.data.skill ?? null,
      note: parsed.data.note ?? null,
    },
  });
  return NextResponse.json({ entry });
}
