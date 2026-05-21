import { NextResponse } from "next/server";
import { z } from "zod";
import { Skill } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// availableWeekdays: Monday-start indices (0=Mon … 6=Sun) the learner can study.
const schema = z.object({
  availableWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

/** Rotating session templates — each carries a concrete study-method tip. */
const SESSIONS: { skill: Skill; title: string; tip: string }[] = [
  {
    skill: "LISTENING",
    title: "Luyện Listening + ôn từ vựng",
    tip: "Nghe lần 1 không nhìn script để bắt ý chính; lần 2 vừa nghe vừa đọc transcript để soi chỗ nghe sót.",
  },
  {
    skill: "READING",
    title: "Luyện Reading",
    tip: "Đọc câu hỏi và gạch chân keyword TRƯỚC, rồi mới scan đoạn văn — đừng đọc kỹ từ đầu đến cuối.",
  },
  {
    skill: "WRITING",
    title: "Luyện Writing Task 2",
    tip: "Dành 5 phút lập dàn ý trước khi viết. Viết xong tự kiểm Task Response và đếm đủ từ.",
  },
  {
    skill: "SPEAKING",
    title: "Luyện Speaking",
    tip: "Ghi âm câu trả lời rồi nghe lại — chú ý phát âm đuôi từ (-s, -ed) và nhịp nói tự nhiên.",
  },
  {
    skill: "GRAMMAR",
    title: "Ngữ pháp + mở rộng từ vựng",
    tip: "Học cụm từ theo chủ đề (collocations) thay vì từ lẻ — dùng được ngay trong Writing & Speaking.",
  },
  {
    skill: "WRITING",
    title: "Luyện Writing Task 1",
    tip: "Tập mô tả số liệu: chọn 2-3 điểm nổi bật nhất, đừng liệt kê mọi con số.",
  },
  {
    skill: "READING",
    title: "Reading + Listening tổng hợp",
    tip: "Bấm giờ như thi thật. Sau khi chấm, ghi lại dạng câu mình sai nhiều nhất để luyện thêm.",
  },
];

const DAY_MS = 86_400_000;

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Recommended sessions per week for a target band. */
function recommendedDays(band: number): number {
  if (band >= 8) return 6;
  if (band >= 7) return 5;
  if (band >= 6) return 4;
  return 3;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const available = new Set(parsed.data.availableWeekdays);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

  // Collect every study day between today and the horizon that the learner is free.
  const sessionDates: Date[] = [];
  for (let d = new Date(today); d.getTime() < horizon.getTime(); d = new Date(d.getTime() + DAY_MS)) {
    if (available.has(mondayIndex(d))) sessionDates.push(new Date(d));
  }

  type NewEntry = { date: Date; skill: Skill | null; title: string; note: string };
  const toCreate: NewEntry[] = [];
  let rotation = 0;

  sessionDates.forEach((d, idx) => {
    const inExamZone = examZoneStart != null && d.getTime() >= examZoneStart.getTime();
    if (inExamZone) {
      toCreate.push({
        date: d,
        skill: null,
        title: "Thi thử IELTS Full",
        note: "Giai đoạn nước rút: làm thi thử trong điều kiện GIỐNG THẬT — bấm giờ, không tra cứu, làm liền 4 kỹ năng. Mỗi lần thi xong, xem kỹ phần AI chấm để biết điểm yếu.",
      });
    } else if (idx % 7 === 6) {
      // A check-in mock test roughly every 1-2 weeks to track progress.
      toCreate.push({
        date: d,
        skill: null,
        title: "Thi thử IELTS Full",
        note: "Làm 1 bài thi thử để theo dõi tiến bộ và làm quen áp lực thời gian. So sánh band với mục tiêu.",
      });
    } else {
      const s = SESSIONS[rotation % SESSIONS.length];
      rotation++;
      toCreate.push({ date: d, skill: s.skill, title: s.title, note: s.tip });
    }
  });

  // Milestone marker on the exam day itself.
  if (examDay) {
    toCreate.push({
      date: examDay,
      skill: null,
      title: "🎯 NGÀY THI IELTS",
      note: "Chúc bạn thi thật tốt! Tối hôm trước ngủ đủ giấc, chuẩn bị giấy tờ sẵn sàng.",
    });
  }

  // Replace any earlier auto-generated plan (today onwards); keep manual entries untouched.
  await prisma.$transaction([
    prisma.studyPlanEntry.deleteMany({
      where: { userId: session.user.id, auto: true, date: { gte: today } },
    }),
    prisma.studyPlanEntry.createMany({
      data: toCreate.map((t) => ({
        userId: session.user!.id,
        date: t.date,
        title: t.title,
        skill: t.skill,
        note: t.note,
        auto: true,
      })),
    }),
  ]);

  const weeks = Math.max(1, Math.round((horizon.getTime() - today.getTime()) / (7 * DAY_MS)));
  const advice = examDay
    ? `Lộ trình ${weeks} tuần tới ngày thi cho mục tiêu band ${targetBand.toFixed(1)}. 2 tuần cuối là giai đoạn thi thử nước rút — cố gắng làm full test thật nhiều để quen áp lực.`
    : `Lộ trình ${weeks} tuần cho mục tiêu band ${targetBand.toFixed(1)}. Hãy đặt ngày thi để hệ thống thêm giai đoạn ôn nước rút trước thi.`;

  return NextResponse.json({
    count: toCreate.length,
    sessionDays: sessionDates.length,
    recommendedPerWeek: recommendedDays(targetBand),
    advice,
  });
}
