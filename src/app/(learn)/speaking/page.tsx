import { Suspense } from "react";
import Link from "next/link";
import { Mic, Clock, Volume2, Brain, Trophy, MessageCircle, ClipboardList, MessagesSquare, ArrowRight } from "lucide-react";
import { SkillIntro } from "@/components/learn/skill-intro";
import { TestPicker } from "@/components/learn/test-picker";
import { TestPickerSkeleton } from "@/components/learn/test-picker-skeleton";
import { attemptCounts } from "@/lib/attempt-counts";
import {} from "@/components/brand";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const PART_CARDS = [
  {
    num: 1,
    title: "Part 1",
    sub: "Câu hỏi cá nhân",
    desc: "4 câu ngắn về bản thân, gia đình, sở thích — luyện trôi chảy.",
    icon: MessageCircle,
    grad: "from-honey to-honey-deep",
  },
  {
    num: 2,
    title: "Part 2",
    sub: "Cue card · 2 phút",
    desc: "Một thẻ chủ đề — chuẩn bị 1 phút, nói 2 phút liên tục.",
    icon: ClipboardList,
    grad: "from-leaf to-leaf-deep",
  },
  {
    num: 3,
    title: "Part 3",
    sub: "Thảo luận sâu",
    desc: "1 câu mở rộng từ chủ đề Part 2 — luyện lập luận, ý kiến.",
    icon: MessagesSquare,
    grad: "from-gold-500 to-rose-500",
  },
] as const;

export default function SpeakingIntroPage() {
  return (
    <div className="relative space-y-8">
      
      <div className="max-w-2xl mx-auto flex justify-center pt-2">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-[#FF4B6E]/30 bg-[#FF4B6E]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider"
          style={{ color: "#FF4B6E" }}
        >
          <Mic className="h-3.5 w-3.5" />
          Speaking
        </span>
      </div>
      <SkillIntro
        title="Speaking"
        subtitle="3 part · từng câu hỏi một · AI examiner đọc câu hỏi"
        icon={Mic}
        grad="from-[#FF6B86] to-[#FF4B6E]"
        startHref="/speaking/start"
        ctaLabel="AI chọn đề ngẫu nhiên (cả 3 Part)"
        bullets={[
          { icon: Volume2, text: "AI examiner đọc từng câu hỏi (cần bật loa)" },
          { icon: Mic, text: "Cần cho phép truy cập micro để ghi âm" },
          { icon: Clock, text: "Tự bấm thời gian nói — luyện theo nhịp của bạn" },
          { icon: Brain, text: "AI ưu tiên đề bạn chưa làm gần đây, tránh trùng lặp" },
          { icon: Trophy, text: "AI chấm 4 tiêu chí + cho sample tham khảo + tips" },
        ]}
      />

      <section className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Luyện từng Part</h2>
            <p className="text-sm text-muted-foreground">
              Chọn riêng 1 part nếu chỉ muốn tập trung phần đó — AI sẽ bốc 1 đề ngẫu nhiên và bắt đầu ngay.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {PART_CARDS.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.num}
                href={`/speaking/start?parts=${p.num}`}
                className="group relative overflow-hidden rounded-2xl border-2 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40"
              >
                <div
                  className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${p.grad} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`}
                />
                <div className={`relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${p.grad} text-white shadow-md`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="relative mt-3">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{p.sub}</div>
                  <div className="text-xl font-extrabold">{p.title}</div>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{p.desc}</p>
                </div>
                <div className="relative mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                  Luyện ngay <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <Suspense fallback={<TestPickerSkeleton />}>
        <SpeakingSetList />
      </Suspense>
    </div>
  );
}

async function SpeakingSetList() {
  const session = await auth();

  const [sets, counts] = await Promise.all([
    prisma.speakingSet.findMany({
      where: { bandStageId: null },
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
    <TestPicker
      grad="from-[#FF6B86] to-[#FF4B6E]"
      icon={Mic}
      emptyText="Chưa có đề Speaking nào."
      items={sets.map((s) => ({
        id: s.id,
        href: `/speaking/${s.id}`,
        title: s.topic,
        imageUrl: s.imageUrl,
        attemptCount: counts.get(s.id) ?? 0,
        pill: { label: "IELTS Speaking", color: "amber" },
        details: ["Part 1 — câu hỏi cá nhân", "Part 2 — cue card", "Part 3 — thảo luận"],
        done: doneIds.has(s.id),
      }))}
    />
  );
}
