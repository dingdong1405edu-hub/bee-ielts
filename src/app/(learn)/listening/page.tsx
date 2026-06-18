import { Suspense } from "react";
import { Headphones, Clock, Volume2, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";
import { TestPicker, questionTypeLabel } from "@/components/learn/test-picker";
import { TestPickerSkeleton } from "@/components/learn/test-picker-skeleton";
import { attemptCounts, displayAttemptCount } from "@/lib/attempt-counts";
import {} from "@/components/brand";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ListeningIntroPage() {
  return (
    <div className="relative space-y-5">
      <SkillIntro
        title="Listening"
        subtitle="1 bài nghe mỗi lần luyện tập · audio + câu hỏi"
        icon={Headphones}
        grad="from-[#5E70E0] to-[#3A4ED4]"
        startHref="/listening/start"
        ctaLabel="AI chọn đề ngẫu nhiên"
        bullets={[
          { icon: Volume2, text: "Nghe audio và trả lời câu hỏi song song" },
          { icon: Clock, text: "Không bấm giờ — hệ thống chỉ đếm thời gian bạn đã làm" },
          { icon: Brain, text: "AI ưu tiên bài bạn chưa làm gần đây, tránh trùng lặp" },
          { icon: Trophy, text: "Sau khi nộp, AI phân tích kết quả + cho transcript để dò lại" },
        ]}
      />

      <Suspense fallback={<TestPickerSkeleton />}>
        <ListeningTestList />
      </Suspense>
    </div>
  );
}

async function ListeningTestList() {
  const session = await auth();

  const [tests, counts] = await Promise.all([
    prisma.listeningTest.findMany({
      where: { bank: "PRACTICE", bandStageId: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, imageUrl: true, questions: { select: { type: true } } },
    }),
    attemptCounts("LISTENING"),
  ]);

  let doneIds = new Set<string>();
  if (session?.user?.id) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, skill: "LISTENING" },
      select: { refId: true },
    });
    doneIds = new Set(attempts.map((a) => a.refId.replace(/^mock-/, "")));
  }

  return (
    <TestPicker
      grad="from-[#5E70E0] to-[#3A4ED4]"
      icon={Headphones}
      emptyText="Chưa có bài nghe nào trong kho luyện tập."
      items={tests.map((t) => ({
        id: t.id,
        href: `/listening/${t.id}`,
        title: t.title,
        imageUrl: t.imageUrl,
        attemptCount: displayAttemptCount(t.id, counts.get(t.id) ?? 0),
        details: [...new Set(t.questions.map((q) => q.type))].map(questionTypeLabel),
        done: doneIds.has(t.id),
      }))}
    />
  );
}
