import { BookOpen, Clock, FileText, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";
import { TestPicker } from "@/components/learn/test-picker";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReadingIntroPage() {
  const session = await auth();

  const tests = await prisma.readingTest.findMany({
    where: { bank: "PRACTICE" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  let doneIds = new Set<string>();
  if (session?.user?.id) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, skill: "READING" },
      select: { refId: true },
    });
    doneIds = new Set(attempts.map((a) => a.refId.replace(/^mock-/, "")));
  }

  return (
    <div className="space-y-8">
      <SkillIntro
        title="Reading"
        subtitle="1 bài đọc mỗi lần luyện tập · không giới hạn thời gian"
        icon={BookOpen}
        grad="from-emerald-500 to-teal-500"
        startHref="/reading/start"
        ctaLabel="AI chọn đề ngẫu nhiên"
        bullets={[
          { icon: FileText, text: "Mỗi lần luyện tập 1 bài đọc với nhiều câu hỏi (MCQ / Nối tiêu đề / Điền chỗ trống / True-False-Not Given)" },
          { icon: Clock, text: "Không bấm giờ — hệ thống chỉ đếm thời gian bạn đã làm" },
          { icon: Brain, text: "AI ưu tiên bài bạn chưa làm gần đây, tránh trùng lặp" },
          { icon: Trophy, text: "Sau khi nộp, AI sẽ phân tích kết quả và đưa tips. Muốn làm cả 4 bài hãy vào Thi thử." },
        ]}
      />

      <TestPicker
        grad="from-emerald-500 to-teal-500"
        emptyText="Chưa có bài đọc nào trong kho luyện tập."
        items={tests.map((t) => ({
          id: t.id,
          href: `/reading/session?ids=${t.id}`,
          title: t.title,
          tags: [t.level, `${t._count.questions} câu hỏi`],
          done: doneIds.has(t.id),
        }))}
      />
    </div>
  );
}
