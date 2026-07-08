import { NextResponse } from "next/server";
import { z } from "zod";
import { Skill } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateStudyPlan, type StudyAssessment } from "@/lib/claude";
import { getApiKey } from "@/lib/api-keys";

// availableWeekdays: Monday-start indices (0=Mon … 6=Sun) the learner can study.
// focusNotes: optional free-text from the learner describing weak skills,
// goals, or constraints — fed straight into the AI prompt.
const schema = z.object({
  availableWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  focusNotes: z.string().max(800).optional().default(""),
  // Clock start time of each session ("HH:MM") + total minutes per session —
  // used to lay out a detailed time-blocked agenda for every study day.
  startTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).optional().default("19:00"),
  sessionMinutes: z.number().int().min(20).max(240).optional().default(60),
  // Learner didn't fix a study time → let the AI assign a clock start per session.
  autoTime: z.boolean().optional().default(false),
});

/** "HH:MM" → minutes from midnight (defaults to 19:00 on a bad value). */
function startMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return 19 * 60;
  return (parseInt(m[1], 10) % 24) * 60 + (parseInt(m[2], 10) % 60);
}

/** minutes from midnight → "HH:MM" (wraps past midnight). */
function fmtClock(min: number): string {
  const h = Math.floor((min % 1440) / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type AgendaBlock = { durationMin: number; activity: string; method: string };

/** Turn the AI's time blocks into a multi-line agenda string with real clock
 *  times laid out from `startMin`. Falls back to the plain note when the AI
 *  didn't return blocks (older response shape / fallback rotation). */
function buildAgenda(
  startMin: number,
  blocks: AgendaBlock[],
  vocabFocus: string,
  fallbackNote: string,
): string {
  if (!blocks.length) {
    return [vocabFocus ? `📚 Từ vựng: ${vocabFocus}` : "", fallbackNote]
      .filter(Boolean)
      .join("\n\n");
  }
  let t = startMin;
  const lines = blocks.map((b) => {
    const dur = Math.min(180, Math.max(5, Math.round(b.durationMin || 15)));
    const from = fmtClock(t);
    t += dur;
    const to = fmtClock(t);
    const head = `🕒 ${from}–${to} · ${b.activity}`;
    return b.method ? `${head}\n   ↳ ${b.method}` : head;
  });
  let note = lines.join("\n");
  if (vocabFocus) note += `\n\n📚 Từ vựng buổi này: ${vocabFocus}`;
  return note;
}

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
  const focusNotes = parsed.data.focusNotes ?? "";
  const autoTime = parsed.data.autoTime;
  // Fallback anchor when the AI doesn't return a per-session start (auto mode):
  // a sensible evening default; otherwise the learner's fixed time.
  const startMin = startMinutes(parsed.data.startTime);
  const sessionMinutes = parsed.data.sessionMinutes;

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

  // Recent full mock-test results — the strongest cross-skill signal for the
  // AI's diagnostic assessment.
  const recentMocks = await prisma.mockAttempt.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    take: 3,
    select: {
      overallBand: true,
      listeningBand: true,
      readingBand: true,
      writingBand: true,
      speakingBand: true,
    },
  });

  // In-app vocab catalogue so the AI points the warm-up block at REAL units
  // instead of inventing word lists. Compact "[level] Unit: lesson, lesson".
  const vocabUnits = await prisma.vocabUnit.findMany({
    orderBy: [{ level: "asc" }, { order: "asc" }],
    select: { title: true, level: true, lessons: { orderBy: { order: "asc" }, select: { title: true } } },
  });
  let availableVocab = vocabUnits
    .map((u) => `- [${u.level}] ${u.title}: ${u.lessons.map((l) => l.title).join(", ")}`)
    .join("\n");
  if (availableVocab.length > 1800) availableVocab = availableVocab.slice(0, 1800) + "…";

  // ---- Build the weekly template: AI first, static rotation as fallback ----
  type Session = {
    skill: Skill;
    title: string;
    note: string;
    vocabFocus: string;
    blocks: AgendaBlock[];
    /** AI-chosen start "HH:MM" when the learner didn't fix a time (auto mode). */
    startTime?: string;
  };
  let weeklyTemplate: Session[] = [];
  let overview = "";
  let assessment: StudyAssessment | null = null;
  let aiUsed = false;

  if (await getApiKey("ANTHROPIC")) {
    try {
      const plan = await generateStudyPlan({
        targetBand,
        weeksUntilExam: weeks,
        hasExamDate: examDay != null,
        daysPerWeek,
        skillScores,
        recentMocks,
        focusNotes,
        sessionMinutes,
        // In auto mode the AI assigns each session's start time; otherwise use
        // the learner's fixed clock time.
        startTime: autoTime ? undefined : parsed.data.startTime,
        autoTime,
        availableVocab,
      });
      const tmpl: Session[] = (plan.weeklyTemplate ?? [])
        .filter((s) => s && s.title && SKILL_VALUES.includes(s.skill as Skill))
        .map((s) => ({
          skill: s.skill as Skill,
          title: String(s.title),
          note: String(s.note ?? ""),
          vocabFocus: typeof s.vocabFocus === "string" ? s.vocabFocus : "",
          startTime:
            typeof s.startTime === "string" && /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.startTime.trim())
              ? s.startTime.trim()
              : undefined,
          blocks: Array.isArray(s.blocks)
            ? s.blocks
                .filter((b) => b && typeof b.activity === "string" && b.activity.trim().length > 0)
                .map((b) => ({
                  durationMin: Number(b.durationMin) || 15,
                  activity: String(b.activity),
                  method: String(b.method ?? ""),
                }))
            : [],
        }));
      if (tmpl.length > 0) {
        // Make the template exactly daysPerWeek long.
        weeklyTemplate = Array.from({ length: daysPerWeek }, (_, i) => tmpl[i % tmpl.length]);
        overview = typeof plan.overview === "string" ? plan.overview : "";
        aiUsed = true;
      }
      if (plan.assessment && Array.isArray(plan.assessment.skills)) {
        assessment = plan.assessment;
      }
    } catch (e) {
      console.error("AI study plan failed, using fallback:", e);
    }
  }

  if (weeklyTemplate.length === 0) {
    weeklyTemplate = Array.from({ length: daysPerWeek }, (_, i) => {
      const f = FALLBACK_SESSIONS[i % FALLBACK_SESSIONS.length];
      return { ...f, vocabFocus: "", blocks: [] as AgendaBlock[] };
    });
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
      // Auto mode: lay the agenda from the AI's per-session start time; fixed
      // mode (or missing): from the learner's chosen clock time.
      const sessionStartMin = s.startTime ? startMinutes(s.startTime) : startMin;
      const note = buildAgenda(sessionStartMin, s.blocks, s.vocabFocus, s.note);
      toCreate.push({ date: d, skill: s.skill, title: s.title, note });
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
    assessment,
  });
}
