import { NextResponse } from "next/server";
import { z } from "zod";
import { Skill } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateStudyPlan } from "@/lib/claude";

// availableWeekdays: Monday-start indices (0=Mon … 6=Sun) the learner can study.
const schema = z.object({
  availableWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

/** Static fallback rotation used when the AI call fails. */
const FALLBACK_SESSIONS: { skill: Skill; title: string; note: string }[] = [
  { skill: "LISTENING", title: "Luyện Listening + ôn từ vựng", note: "Nghe lần 1 không nhìn script để bắt ý chính; lần 2 vừa nghe vừa đọc transcript." },
  { skill: "READING", title: "Luyện Reading", note: "Đọc câu hỏi và gạch chân keyword trước, rồi mới scan đoạn văn." },
  { skill: "WRITING", title: "Luyện Writing Task 2", note: "Dành 5 phút lập dàn ý trước khi viết; viết xong tự kiểm Task Response và đếm từ." },
  { skill: "SPEAKING", title: "Luyện Speaking", note: "Ghi âm câu trả lời rồi nghe lại — chú ý phát âm đuôi từ và nhịp nói." },
  { skill: "GRAMMAR", title: "Ngữ pháp + mở rộng từ vựng", note: "Học cụm từ theo chủ đề (collocations) thay vì từ lẻ." },
  { skill: "WRITING", title: "Luyện Writing Task 1", note: "Tập mô tả số liệu: chọn 2-3 điểm nổi bật, đừng liệt kê mọi con số." },
  { skill: "READING", title: "Reading + Listening tổng hợp", note: "Bấm giờ như thi thật; ghi lại dạng câu sai nhiều nhất." },
];

const SKILL_VALUES: Skill[] = ["READING", "LISTENING", "WRITING", "SPEAKING", "VOCAB", "GRAMMAR"];
const DAY_MS = 86_400_000;

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function recommendedDays(band: number): number {
  if (band >= 8) return 6;
  if (band >= 7) return 5;
  if (band >= 6) return 4;
  return 3;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const available = new Set(parsed.data.availableWeekdays);
  const daysPerWeek = available.size;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetBand: true, examDate: true },
  });
  if (!user) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });

  const targetBand = user.targetBand ?? 6.0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Horizon = exam date if it's in the future, otherwise an 8-week plan.
  let examDay: Date | null = null;
  if (user.examDate) {
    const ed = new Date(user.examDate);
    ed.setHours(0, 0, 0, 0);
    if (ed.getTime() > today.getTime()) examDay = ed;
  }
  const horizon = examDay ?? new Date(today.getTime() + 56 * DAY_MS);
  const examZoneStart = examDay ? new Date(examDay.getTime() - 14 * DAY_MS) : null;
  const weeks = Math.max(1, Math.round((horizon.getTime() - today.getTime()) / (7 * DAY_MS)));

  // Every free day between today and the horizon.
  const sessionDates: Date[] = [];
  for (let d = new Date(today); d.getTime() < horizon.getTime(); d = new Date(d.getTime() + DAY_MS)) {
    if (available.has(mondayIndex(d))) sessionDates.push(new Date(d));
  }

  // Recent per-skill performance so the AI can target weak skills.
  const attempts = await prisma.attempt.findMany({
    where: { userId, score: { not: null } },
    select: { skill: true, score: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const agg = new Map<string, { sum: number; n: number }>();
  for (const a of attempts) {
    const cur = agg.get(a.skill) ?? { sum: 0, n: 0 };
    cur.sum += a.score ?? 0;
    cur.n += 1;
    agg.set(a.skill, cur);
  }
  const skillScores = [...agg.entries()].map(([skill, v]) => ({
    skill,
    avgBand: v.sum / v.n,
    attempts: v.n,
  }));

  // ---- Build the weekly template: AI first, static rotation as fallback ----
  let weeklyTemplate: { skill: Skill; title: string; note: string }[] = [];
  let overview = "";
  let aiUsed = false;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const plan = await generateStudyPlan({
        targetBand,
        weeksUntilExam: weeks,
        hasExamDate: examDay != null,
        daysPerWeek,
        skillScores,
      });
      const tmpl = (plan.weeklyTemplate ?? [])
        .filter((s) => s && s.title && SKILL_VALUES.includes(s.skill as Skill))
        .map((s) => ({ skill: s.skill as Skill, title: String(s.title), note: String(s.note ?? "") }));
      if (tmpl.length > 0) {
        // Make the template exactly daysPerWeek long.
        weeklyTemplate = Array.from({ length: daysPerWeek }, (_, i) => tmpl[i % tmpl.length]);
        overview = typeof plan.overview === "string" ? plan.overview : "";
        aiUsed = true;
      }
    } catch (e) {
      console.error("AI study plan failed, using fallback:", e);
    }
  }

  if (weeklyTemplate.length === 0) {
    weeklyTemplate = Array.from({ length: daysPerWeek }, (_, i) => FALLBACK_SESSIONS[i % FALLBACK_SESSIONS.length]);
  }

  type NewEntry = { date: Date; skill: Skill | null; title: string; note: string };
  const toCreate: NewEntry[] = [];

  sessionDates.forEach((d, idx) => {
    const inExamZone = examZoneStart != null && d.getTime() >= examZoneStart.getTime();
    if (inExamZone) {
      toCreate.push({
        date: d,
        skill: null,
        title: "Thi thử IELTS Full",
        note: "Giai đoạn nước rút: làm thi thử GIỐNG THẬT — bấm giờ, không tra cứu, làm liền 4 kỹ năng. Xem kỹ phần AI chấm để biết điểm yếu.",
      });
    } else if (idx % 7 === 6) {
      toCreate.push({
        date: d,
        skill: null,
        title: "Thi thử IELTS Full",
        note: "Làm 1 bài thi thử để theo dõi tiến bộ và quen áp lực thời gian. So sánh band với mục tiêu.",
      });
    } else {
      const s = weeklyTemplate[idx % weeklyTemplate.length];
      toCreate.push({ date: d, skill: s.skill, title: s.title, note: s.note });
    }
  });

  if (examDay) {
    toCreate.push({
      date: examDay,
      skill: null,
      title: "🎯 NGÀY THI IELTS",
      note: "Chúc bạn thi thật tốt! Tối hôm trước ngủ đủ giấc, chuẩn bị giấy tờ sẵn sàng.",
    });
  }

  // Replace any earlier auto-generated plan (today onwards); keep manual entries.
  await prisma.$transaction([
    prisma.studyPlanEntry.deleteMany({ where: { userId, auto: true, date: { gte: today } } }),
    prisma.studyPlanEntry.createMany({
      data: toCreate.map((t) => ({
        userId,
        date: t.date,
        title: t.title,
        skill: t.skill,
        note: t.note,
        auto: true,
      })),
    }),
  ]);

  const advice =
    overview ||
    (examDay
      ? `Lộ trình ${weeks} tuần tới ngày thi cho mục tiêu band ${targetBand.toFixed(1)}. 2 tuần cuối là giai đoạn thi thử nước rút.`
      : `Lộ trình ${weeks} tuần cho mục tiêu band ${targetBand.toFixed(1)}. Đặt ngày thi để có thêm giai đoạn ôn nước rút.`);

  return NextResponse.json({
    count: toCreate.length,
    aiUsed,
    recommendedPerWeek: recommendedDays(targetBand),
    advice,
  });
}
