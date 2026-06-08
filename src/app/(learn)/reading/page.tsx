import { Suspense } from "react";
import { BookOpen, Clock, FileText, Brain, Trophy } from "lucide-react";
import { CEFRLevel } from "@prisma/client";
import { SkillIntro } from "@/components/learn/skill-intro";
import { TestPicker, questionTypeLabel, type PillColor } from "@/components/learn/test-picker";
import { TestPickerSkeleton } from "@/components/learn/test-picker-skeleton";
import { attemptCounts } from "@/lib/attempt-counts";
import {} from "@/components/brand";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<CEFRLevel, PillColor> = {
  A1: "emerald",
  A2: "emerald",
  B1: "sky",
  B2: "indigo",
  C1: "violet",
  C2: "rose",
};

export default function ReadingIntroPage() {
  return (
    <div className="relative space-y-8">
      
      <div className="flex justify-center">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-[#58CC02]/30 bg-[#58CC02]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#58CC02" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#58CC02]" />
          Reading
        </span>
      </div>
      <SkillIntro
        title="Reading"
        subtitle="1 bài đọc mỗi lần luyện tập · không giới hạn thời gian"
        icon={BookOpen}
        grad="from-sage-500 to-teal-500"
        startHref="/reading/start"
        ctaLabel="AI chọn đề ngẫu nhiên"
        bullets={[
          { icon: FileText, text: "Mỗi lần luyện tập 1 bài đọc với nhiều câu hỏi (MCQ / Nối tiêu đề / Điền chỗ trống / True-False-Not Given)" },
          { icon: Clock, text: "Không bấm giờ — hệ thống chỉ đếm thời gian bạn đã làm" },
          { icon: Brain, text: "AI ưu tiên bài bạn chưa làm gần đây, tránh trùng lặp" },
          { icon: Trophy, text: "Sau khi nộp, AI sẽ phân tích kết quả và đưa tips. Muốn làm cả 4 bài hãy vào Thi thử." },
        ]}
      />

      <Suspense fallback={<TestPickerSkeleton />}>
        <ReadingTestList />
      </Suspense>
    </div>
  );
}

async function ReadingTestList() {
  const session = await auth();

  const [tests, counts] = await Promise.all([
    prisma.readingTest.findMany({
      where: { bank: "PRACTICE", bandStageId: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, level: true, imageUrl: true, questions: { select: { type: true } } },
    }),
    attemptCounts("READING"),
  ]);

  let doneIds = new Set<string>();
  if (session?.user?.id) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, skill: "READING" },
      select: { refId: true },
    });
    doneIds = new Set(attempts.map((a) => a.refId.replace(/^mock-/, "")));
  }

  return (
    <TestPicker
      grad="from-sage-500 to-teal-500"
      icon={BookOpen}
      emptyText="Chưa có bài đọc nào trong kho luyện tập."
      items={tests.map((t) => ({
        id: t.id,
        href: `/reading/session?ids=${t.id}`,
        title: t.title,
        imageUrl: t.imageUrl,
        attemptCount: counts.get(t.id) ?? 0,
        pill: { label: t.level, color: LEVEL_COLOR[t.level] },
        details: [...new Set(t.questions.map((q) => q.type))].map(questionTypeLabel),
        done: doneIds.has(t.id),
      }))}
    />
  );
}
