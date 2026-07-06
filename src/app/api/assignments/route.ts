/**
 * POST /api/assignments — create an assignment for a class (TEACHER/ADMIN).
 *
 * Body (accepts both camelCase and snake_case for the id/question arrays):
 *   { classId, title, deadline?, description?, config?,
 *     bankQuestionIds[] | bank_question_ids[],       // ids from the shared bank
 *     customQuestions[] | custom_questions[] }        // GV tự gõ câu hỏi mới
 *
 *   - bankQuestionIds: ids from the existing BeeIELTS question bank (Question).
 *     Every id is validated to exist; unknown ids reject the whole request.
 *   - customQuestions: full question payloads the teacher just authored. These
 *     are INSERTED first (createdById = the teacher, isPublic = false → đề riêng),
 *     then their new ids are appended after the bank ids.
 *   - At least one question (bank or custom) is required.
 *   - deadline: ISO datetime string (optional — draft assignments may omit it).
 *   - config: JSON settings (thời gian làm bài, xem đáp án, xáo trộn…).
 *
 * A plain TEACHER may only target their OWN class; ADMIN/OWNER any class.
 *
 * The insert(s) + assignment.create run inside a single prisma.$transaction, so
 * a failure anywhere (bad question, DB error) rolls back everything — no orphan
 * questions are left behind and no half-built assignment is created.
 *
 * Question ORDER is authoritative via Assignment.questionIds (the GET route
 * renders strictly in that array order), so we build it as
 * [...bank ids in given order, ...custom ids in given order].
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, QuestionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTeacher, canManageAllClasses } from "@/lib/teacher-auth";
import { notifyMany } from "@/lib/notify";
import { sanitizeSvg } from "@/lib/groq";

/** Re-sanitize any AI-drawn SVG figures in config.reading before they are
 *  stored + served to students (a teacher could POST arbitrary config). Handles
 *  both the multi-part shape (config.reading.parts[].figures) and the legacy
 *  single-passage shape (config.reading.figures). */
function sanitizeFigureArray(figures: unknown): unknown {
  if (!Array.isArray(figures)) return figures;
  return figures
    .map((f) => {
      const fo = (f ?? {}) as Record<string, unknown>;
      return { ...fo, svg: sanitizeSvg(fo.svg) };
    })
    .filter((f) => typeof f.svg === "string" && (f.svg as string).length > 0);
}
function sanitizeConfigFigures(config: Record<string, unknown> | undefined): void {
  if (!config || typeof config !== "object") return;
  const reading = (config as Record<string, unknown>).reading;
  if (!reading || typeof reading !== "object") return;
  const r = reading as Record<string, unknown>;
  if (Array.isArray(r.figures)) r.figures = sanitizeFigureArray(r.figures);
  if (Array.isArray(r.parts)) {
    r.parts = r.parts.map((p) => {
      const po = (p ?? {}) as Record<string, unknown>;
      if (Array.isArray(po.figures)) po.figures = sanitizeFigureArray(po.figures);
      return po;
    });
  }
}

/** One uploaded file attached to a custom question (audio MP3 / image / pdf). */
const attachmentSchema = z.object({
  kind: z.enum(["audio", "image", "pdf", "other"]).default("other"),
  url: z.string().url("URL file không hợp lệ"),
  name: z.string().max(300).optional(),
  mime: z.string().max(150).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

/** A teacher-authored question. `correctAnswer` is required (any JSON shape);
 *  `options` holds MCQ/matching choices. Kept permissive on the JSON payloads —
 *  the shape mirrors whatever the bank questions use. */
const customQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  // Empty allowed: table/form-completion members share one grid on the first
  // member, so the rest legitimately have an empty prompt (they still carry the
  // answer). Trusted content — generated server-side or reviewed by the teacher.
  prompt: z.string().trim().max(10000),
  options: z.any().optional(),
  correctAnswer: z
    .any()
    .refine((v) => v !== undefined && v !== null, "Câu hỏi tự tạo cần có đáp án đúng"),
  explanation: z.string().max(5000).optional(),
  attachments: z.array(attachmentSchema).max(20).optional(),
  displayNumber: z.number().int().optional(),
  formGroup: z.string().max(200).optional(),
});

const bodySchema = z
  .object({
    classId: z.string().min(1),
    title: z.string().trim().min(1, "Cần tiêu đề").max(200),
    deadline: z.coerce.date().optional(),
    /** Hẹn giờ mở bài cho học sinh (null = mở ngay). */
    openAt: z.coerce.date().optional(),
    /** Kỹ năng: quyết định luồng làm bài + cách chấm. */
    skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]).optional(),
    // Accept camelCase (existing) or snake_case (as spec'd) → normalise below.
    bankQuestionIds: z.array(z.string().min(1)).max(500).optional(),
    bank_question_ids: z.array(z.string().min(1)).max(500).optional(),
    customQuestions: z.array(customQuestionSchema).max(200).optional(),
    custom_questions: z.array(customQuestionSchema).max(200).optional(),
    description: z.string().max(5000).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .transform((b) => ({
    ...b,
    bankQuestionIds: b.bankQuestionIds ?? b.bank_question_ids ?? [],
    customQuestions: b.customQuestions ?? b.custom_questions ?? [],
  }))
  // Writing/Speaking are AI-graded from config content, so they need no
  // question list; Reading/Listening still require ≥1 question.
  .refine(
    (b) =>
      b.skill === "WRITING" ||
      b.skill === "SPEAKING" ||
      b.bankQuestionIds.length + b.customQuestions.length > 0,
    { message: "Cần ít nhất 1 câu hỏi (từ ngân hàng đề hoặc tự tạo)", path: ["bankQuestionIds"] },
  );

/** JSON pass-throughs from an untyped body → Prisma's JSON input type. */
const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

export async function POST(req: Request) {
  const gate = await requireTeacher();
  if (gate instanceof NextResponse) return gate;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }
  const { classId, title, deadline, openAt, skill, bankQuestionIds, customQuestions, description, config } =
    parsed.data;

  // Neutralise any SVG figures before they persist + reach students.
  sanitizeConfigFigures(config);

  // Class must exist and be managed by the caller.
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, teacherId: true },
  });
  if (!cls) {
    return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  }
  if (cls.teacherId !== gate.id && !canManageAllClasses(gate.role)) {
    return NextResponse.json({ error: "Bạn không phụ trách lớp này" }, { status: 403 });
  }

  // Validate every bank question id against the real question bank (order-preserving dedupe).
  const bankIds = Array.from(new Set(bankQuestionIds));
  if (bankIds.length > 0) {
    const found = await prisma.question.findMany({
      where: { id: { in: bankIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((q) => q.id));
    const missing = bankIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Một số câu hỏi không tồn tại trong ngân hàng đề", missing },
        { status: 400 },
      );
    }
  }

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      // 1) Insert the teacher's custom questions FIRST, stamping createdById so
      //    they're owned by this teacher (đề riêng, isPublic defaults to false).
      //    Created one-by-one so the returned id order EXACTLY matches the input
      //    order — that order feeds Assignment.questionIds (display order).
      const customIds: string[] = [];
      for (const [i, q] of customQuestions.entries()) {
        const created = await tx.question.create({
          data: {
            type: q.type,
            prompt: q.prompt,
            options: q.options === undefined ? undefined : asJson(q.options),
            correctAnswer: asJson(q.correctAnswer),
            explanation: q.explanation ?? null,
            attachments: q.attachments === undefined ? undefined : asJson(q.attachments),
            displayNumber: q.displayNumber ?? null,
            formGroup: q.formGroup ?? null,
            // Position custom questions after the bank block for any order-based sort.
            order: bankIds.length + i,
            createdById: gate.id,
            isPublic: false,
          },
          select: { id: true },
        });
        customIds.push(created.id);
      }

      // 2) Link bank + freshly-created custom ids into the new assignment.
      return tx.assignment.create({
        data: {
          classId,
          title,
          description: description ?? null,
          deadline: deadline ?? null,
          openAt: openAt ?? null,
          skill: skill ?? null,
          questionIds: [...bankIds, ...customIds],
          config: config === undefined ? undefined : asJson(config),
        },
        select: {
          id: true,
          classId: true,
          title: true,
          deadline: true,
          questionIds: true,
          createdAt: true,
        },
      });
    });

    // Notify every enrolled student that a new assignment is waiting.
    const members = await prisma.classMember.findMany({
      where: { classId },
      select: { studentId: true },
    });
    await notifyMany(
      members.map((m) => m.studentId),
      {
        kind: "class",
        title: "Có bài tập mới 📚",
        body: `Thầy cô vừa giao bài "${title}". Vào lớp để làm nhé!`,
        href: "/classes",
      },
    );

    return NextResponse.json(
      { assignment, customCreated: assignment.questionIds.length - bankIds.length },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/assignments] transaction failed:", err);
    return NextResponse.json(
      { error: "Không tạo được bài tập. Mọi thay đổi đã được hoàn tác." },
      { status: 500 },
    );
  }
}
