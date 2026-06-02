import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAdminActivity } from "@/lib/admin-activity";

const exerciseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("translate"),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    answer: z.string().min(1),
  }),
  z.object({
    type: z.literal("match"),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    answer: z.string().min(1),
  }),
  z.object({
    type: z.literal("type"),
    prompt: z.string().min(1),
    answer: z.string().min(1),
  }),
]);

const lessonSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(1),
  exercises: z.array(exerciseSchema).min(1),
});

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    unitId: z.string().min(1),
    lessons: z.array(lessonSchema).min(1),
  }),
  z.object({
    mode: z.literal("new"),
    unitTitle: z.string().min(1),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    order: z.number().int().min(1),
    lessons: z.array(lessonSchema).min(1),
  }),
]);

/** Tạo bài học Vocabulary — admin / owner. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const data = parsed.data;

  try {
    if (data.mode === "new") {
      const unit = await prisma.vocabUnit.create({
        data: {
          title: data.unitTitle,
          level: data.level,
          order: data.order,
          lessons: {
            create: data.lessons.map((l) => ({
              title: l.title,
              order: l.order,
              exercises: l.exercises,
            })),
          },
        },
      });
      await logAdminActivity({
        action: "CREATE",
        entityType: "VOCAB_UNIT",
        entityId: unit.id,
        entityTitle: `[${unit.level}] ${unit.title} (+${data.lessons.length} lessons)`,
      });
      return NextResponse.json({ id: unit.id });
    }

    const unit = await prisma.vocabUnit.findUnique({ where: { id: data.unitId } });
    if (!unit) return NextResponse.json({ error: "Không tìm thấy unit" }, { status: 404 });

    await prisma.$transaction(
      data.lessons.map((l) =>
        prisma.vocabLesson.create({
          data: { unitId: data.unitId, title: l.title, order: l.order, exercises: l.exercises },
        }),
      ),
    );
    await logAdminActivity({
      action: "CREATE",
      entityType: "VOCAB_LESSON",
      entityId: data.unitId,
      entityTitle: `${data.lessons.length} lesson(s) → ${unit.title}`,
    });
    return NextResponse.json({ id: data.unitId });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Đã có unit với cùng level và thứ tự (order). Hãy đổi order." },
        { status: 409 },
      );
    }
    console.error("[admin/vocab]", e);
    return NextResponse.json({ error: "Lưu thất bại" }, { status: 500 });
  }
}
