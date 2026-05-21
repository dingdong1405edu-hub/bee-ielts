import { Mic, Clock, Volume2, Brain, Trophy } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";
import { TestPicker } from "@/components/learn/test-picker";
import { attemptCounts } from "@/lib/attempt-counts";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SpeakingIntroPage() {
  const session = await auth();

  const [sets, counts] = await Promise.all([
    prisma.speakingSet.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, topic: true, imageUrl: true },
    }),
    attemptCounts("SPEAKING"),
  ]);

  let doneIds = new Set<string>();
  if (session?.user?.id) {
    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, skill: "SPEAKING" },
      select: { refId: true },
    });
    doneIds = new Set(attempts.map((a) => a.refId.replace(/^mock-/, "")));
  }

  return (
    <div className="space-y-8">
      <SkillIntro
        title="Speaking"
        subtitle="3 part · từng câu hỏi một · AI examiner đọc câu hỏi"
        icon={Mic}
        grad="from-indigo-500 to-blue-500"
        startHref="/speaking/start"
        ctaLabel="AI chọn đề ngẫu nhiên"
        bullets={[
          { icon: Volume2, text: "AI examiner đọc từng câu hỏi (cần bật loa)" },
          { icon: Mic, text: "Cần cho phép truy cập micro để ghi âm" },
          { icon: Clock, text: "Tự bấm thời gian nói — luyện theo nhịp của bạn" },
          { icon: Brain, text: "AI ưu tiên đề bạn chưa làm gần đây, tránh trùng lặp" },
          { icon: Trophy, text: "AI chấm 4 tiêu chí + cho sample tham khảo + tips" },
        ]}
      />

      <TestPicker
        grad="from-indigo-500 to-blue-500"
        icon={Mic}
        emptyText="Chưa có đề Speaking nào."
        items={sets.map((s) => ({
          id: s.id,
          href: `/speaking/${s.id}`,
          title: s.topic,
          imageUrl: s.imageUrl,
          attemptCount: counts.get(s.id) ?? 0,
          pill: { label: "IELTS Speaking", color: "indigo" },
          details: ["Part 1 — câu hỏi cá nhân", "Part 2 — cue card", "Part 3 — thảo luận"],
          done: doneIds.has(s.id),
        }))}
      />
    </div>
  );
}
