import { Suspense } from "react";
import Link from "next/link";
import { Mic, Clock, Volume2, Brain, Trophy, MessageCircle, ClipboardList, MessagesSquare, ArrowRight, Sparkles } from "lucide-react";
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
    grad: "from-gold-400 to-gold-600",
  },
  {
    num: 2,
    title: "Part 2",
    sub: "Cue card · 2 phút",
    desc: "Một thẻ chủ đề — chuẩn bị 1 phút, nói 2 phút liên tục.",
    icon: ClipboardList,
    grad: "from-gold-300 to-gold-500",
  },
  {
    num: 3,
    title: "Part 3",
    sub: "Thảo luận sâu",
    desc: "1 câu mở rộng từ chủ đề Part 2 — luyện lập luận, ý kiến.",
    icon: MessagesSquare,
    grad: "from-gold-500 to-gold-700",
  },
] as const;

export default function SpeakingIntroPage() {
  return (
    <div className="relative space-y-5">
      <SkillIntro
        title="Speaking"
        subtitle="3 part · từng câu hỏi một · AI examiner đọc câu hỏi"
        icon={Mic}
        grad="from-gold-400 to-gold-600"
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

      {/* Roulette hero — fanned-deck "rút thẻ" game. Sits before the full
          set list so it gets prominent play; multiplayer ships in v2. */}
      <Link
        href="/speaking/roulette"
        className="group max-w-4xl mx-auto block relative overflow-hidden rounded-3xl p-5 md:p-6 text-white shadow-xl bg-gradient-to-br from-[#5e7a3f] via-[#4d6735] to-[#3b5128] hover:-translate-y-0.5 transition-transform"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="absolute -left-2 bottom-0 text-6xl rotate-[-18deg] opacity-30 select-none">🎴</div>
        <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/30">
          <Sparkles className="h-3 w-3" /> Mới
        </div>
        <div className="relative flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/30 shrink-0">
            <span className="text-2xl">🎲</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Speaking Roulette</h2>
            <p className="text-white/90 text-sm mt-0.5">Rút thẻ chủ đề ngẫu nhiên — Part 1 / 2 / 3 + vocab in context.</p>
          </div>
          <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

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
      grad="from-gold-400 to-gold-600"
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
