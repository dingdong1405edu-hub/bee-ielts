import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// date: "YYYY-MM-DD" to set, or null to clear the exam date.
const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });

  let examDate: Date | null = null;
  if (parsed.data.date) {
    examDate = new Date(`${parsed.data.date}T00:00:00`);
    if (Number.isNaN(examDate.getTime())) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { examDate },
  });
  return NextResponse.json({ ok: true });
}
