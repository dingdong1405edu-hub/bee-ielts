import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const lessonSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().min(1),
  content: z.string().min(1),
  exercises: z
    .array(
      z.object({
        type: z.literal("fill"),
        prompt: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(1),
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

/** Tạo bài học Grammar — admin / owner. */
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
      const unit = await prisma.grammarUnit.create({
        data: {
          title: data.unitTitle,
          level: data.level,
          order: data.order,
          lessons: {
            create: data.lessons.map((l) => ({
              title: l.title,
              order: l.order,
              content: l.content,
              exercises: l.exercises,
            })),
          },
        },
      });
      return NextResponse.json({ id: unit.id });
    }

    const unit = await prisma.grammarUnit.findUnique({ where: { id: data.unitId } });
    if (!unit) return NextResponse.json({ error: "Không tìm thấy unit" }, { status: 404 });

    await prisma.$transaction(
      data.lessons.map((l) =>
        prisma.grammarLesson.create({
          data: {
            unitId: data.unitId,
            title: l.title,
            order: l.order,
            content: l.content,
            exercises: l.exercises,
          },
        }),
      ),
    );
    return NextResponse.json({ id: data.unitId });
  } catch (e) {
    console.error("[admin/grammar]", e);
    return NextResponse.json({ error: "Lưu thất bại" }, { status: 500 });
  }
}
