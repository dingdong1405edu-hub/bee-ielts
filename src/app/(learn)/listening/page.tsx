import { Headphones, Clock, Volume2, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";
import { TestPicker } from "@/components/learn/test-picker";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ListeningIntroPage() {
  const session = await auth();

  const tests = await prisma.listeningTest.findMany({
    where: { bank: "PRACTICE" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  let doneIds = new Set<string>();
  if (session?.user?.id) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, skill: "LISTENING" },
      select: { refId: true },
    });
    doneIds = new Set(attempts.map((a) => a.refId.replace(/^mock-/, "")));
  }

  return (
    <div className="space-y-8">
      <SkillIntro
        title="Listening"
        subtitle="1 bài nghe mỗi lần luyện tập · audio + câu hỏi"
        icon={Headphones}
        grad="from-amber-500 to-orange-500"
        startHref="/listening/start"
        ctaLabel="AI chọn đề ngẫu nhiên"
        bullets={[
          { icon: Volume2, text: "Nghe audio và trả lời câu hỏi song song" },
          { icon: Clock, text: "Không bấm giờ — hệ thống chỉ đếm thời gian bạn đã làm" },
          { icon: Brain, text: "AI ưu tiên bài bạn chưa làm gần đây, tránh trùng lặp" },
          { icon: Trophy, text: "Sau khi nộp, AI phân tích kết quả + cho transcript để dò lại" },
        ]}
      />

      <TestPicker
        grad="from-amber-500 to-orange-500"
        emptyText="Chưa có bài nghe nào trong kho luyện tập."
        items={tests.map((t) => ({
          id: t.id,
          href: `/listening/${t.id}`,
          title: t.title,
          tags: [`${t._count.questions} câu hỏi`],
          done: doneIds.has(t.id),
        }))}
      />
    </div>
  );
}
