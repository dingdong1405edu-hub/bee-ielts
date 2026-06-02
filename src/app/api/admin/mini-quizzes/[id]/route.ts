import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const optionSchema = z.object({
  label: z.string().min(1).max(80),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
const questionSchema = z.object({
  type: z.enum(["IMAGE_CHOICE", "TEXT_CHOICE"]),
  prompt: z.string().min(1).max(400),
  audioUrl: z.string().url().optional().or(z.literal("")),
  options: z.array(optionSchema).min(2).max(6),
  correctIndex: z.number().int().min(0),
});
const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]).optional(),
  questions: z.array(questionSchema).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  try {
    // If questions changed, replace the full set — simplest correct semantics
    // for a quiz this size (admin edits are bulk, not per-question).
    if (parsed.data.questions) {
      for (const q of parsed.data.questions) {
        if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
          return NextResponse.json(
            { error: `correctIndex ngoài phạm vi: ${q.prompt.slice(0, 50)}` },
            { status: 400 },
          );
        }
      }
      await prisma.miniQuestion.deleteMany({ where: { miniQuizId: id } });
      await prisma.miniQuestion.createMany({
        data: parsed.data.questions.map((q, i) => ({
          miniQuizId: id,
          type: q.type,
          prompt: q.prompt,
          audioUrl: q.audioUrl ? q.audioUrl : null,
          options: q.options.map((o) => ({
            label: o.label,
            ...(o.imageUrl ? { imageUrl: o.imageUrl } : {}),
          })),
          correctIndex: q.correctIndex,
          order: i,
        })),
      });
    }
    const { questions: _drop, ...rest } = parsed.data;
    const quiz = await prisma.bandClimbMiniQuiz.update({
      where: { id },
      data: rest,
      include: { questions: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ quiz });
  } catch (e) {
    console.error("[admin/mini-quizzes PATCH]", e);
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.bandClimbMiniQuiz.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/mini-quizzes DELETE]", e);
    return NextResponse.json({ error: "Xóa thất bại" }, { status: 500 });
  }
}
