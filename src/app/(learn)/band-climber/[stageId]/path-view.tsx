"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  Play,
  ChevronLeft,
  ListChecks,
  Star,
  Trophy,
  Package,
  X,
  Brain,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Leaf } from "@/components/brand";
import { StageView } from "./stage-view";

export type SkillKey = "reading" | "listening" | "writing" | "speaking";

export interface PathExercise {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  // "quiz" = small violet Duolingo-style mini-quiz; "test" = full-size
  // skill-colored long test. Both flow inline in the same path column —
  // no sub-section divider — so the stage feels like one continuous chặng.
  kind?: "test" | "quiz";
}

export interface PathGroup {
  skill: SkillKey;
  label: string;
  // All exercises for this skill, ORDERED as the path-view should display
  // them top-to-bottom. Mini-quizzes are interleaved here (with kind:"quiz")
  // rather than living in a separate bucket.
  exercises: PathExercise[];
}

const SKILL_META: Record<
  SkillKey,
  { label: string; icon: React.ElementType; from: string; to: string; ring: string; bubble: string }
> = {
  reading: {
    label: "Reading",
    icon: BookOpen,
    from: "from-sage-500",
    to: "to-teal-500",
    ring: "ring-sage-400/60",
    bubble: "from-sage-500 to-teal-600",
  },
  listening: {
    label: "Listening",
    icon: Headphones,
    from: "from-[#4FC3F7]",
    to: "to-[#1CB0F6]",
    ring: "ring-gold-400/60",
    bubble: "from-gold-500 to-gold-600",
  },
  writing: {
    label: "Writing",
    icon: PenLine,
    from: "from-rose-500",
    to: "to-pink-500",
    ring: "ring-rose-400/60",
    bubble: "from-rose-500 to-pink-600",
  },
  speaking: {
    label: "Speaking",
    icon: Mic,
    from: "from-leaf",
    to: "to-leaf-deep",
    ring: "ring-leaf/60",
    bubble: "from-leaf to-leaf-deep",
  },
};

interface Stage {
  id: string;
  fromBand: number;
  toBand: number;
  title: string;
  subtitle: string | null;
  description: string | null;
}

interface TipsMd {
  reading: string;
  listening: string;
  writing: string;
  speaking: string;
}

/**
 * Duolingo-style stage path. Each skill becomes a section with a zigzag
 * column of round buttons; the very first exercise across all sections
 * is marked "current" with a bounce + "HỌC VƯỢT?" speech bubble. The
 * "HƯỚNG DẪN" button on the green hero opens the existing markdown tips
 * inside a slide-up drawer so this main view stays focused on doing.
 */
export function PathView({
  stage,
  groups,
  tips,
  showTipsButton = true,
  initiallyCompleted = false,
}: {
  stage: Stage;
  groups: PathGroup[];
  tips: TipsMd;
  // Admin can hide the HƯỚNG DẪN button on the hero (BandStage.tipsShowOnTest).
  // Defaults true so existing stages keep their behavior.
  showTipsButton?: boolean;
  /** Whether the user already tapped "Đánh dấu hoàn thành" on this stage —
   *  flips the bottom CTA from "mark as done" to "mở chặng tiếp theo". */
  initiallyCompleted?: boolean;
}) {
  const [showTips, setShowTips] = useState(false);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [marking, setMarking] = useState(false);
  const router = useRouter();
  const flat = groups.flatMap((g) =>
    g.exercises.map((e) => ({ ...e, skill: g.skill })),
  );
  const currentId = flat[0]?.id;

  const hasAny = flat.length > 0;

  const markComplete = async () => {
    if (completed || marking) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/band-climber/stages/${stage.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi");
      setCompleted(true);
      toast.success("Đã đánh dấu hoàn thành chặng. Chặng tiếp theo đã mở khoá!");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setMarking(false);
    }
  };

  return (
    // Solid bg-card so the global .ambient-bg (fixed grid + brand glows
    // sitting at z-index: -10) doesn't bleed through. The previous
    // `from-sage-50/60` gradient was 60% alpha at the top — that's
    // where the ambient grid + center glow showed through and produced
    // the dim "fog" effect over the path. A subtle emerald accent strip
    // lives inside Hero, so we don't need a body-level tint anymore.
    <div className="min-h-screen bg-card -mx-4 md:-mx-8 -mt-4 md:-mt-8 pb-20">
      <Hero stage={stage} onShowTips={showTipsButton ? () => setShowTips(true) : null} />

      {stage.description && (
        <div className="max-w-md mx-auto px-4 pt-5">
          <p className="text-sm text-muted-foreground leading-relaxed text-center italic">
            {stage.description}
          </p>
        </div>
      )}

      {!hasAny ? (
        <div className="max-w-md mx-auto px-4 pt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold-100 text-gold-700 mb-3">
            <Package className="h-8 w-8" />
          </div>
          <p className="font-bold text-lg">Chặng chưa có bài tập</p>
          <p className="text-sm text-muted-foreground mt-1">
            Admin chưa gắn đề Reading / Listening / Writing / Speaking vào chặng này. Quay lại sau nhé
            {showTipsButton && (
              <>
                {" "}— hoặc bấm{" "}
                <button
                  onClick={() => setShowTips(true)}
                  className="font-bold text-primary underline"
                >
                  HƯỚNG DẪN
                </button>{" "}
                xem mẹo trước
              </>
            )}
            .
          </p>
        </div>
      ) : (
        <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
          {groups.map((g) => (
            <PathSection key={g.skill} group={g} currentId={currentId} />
          ))}

          <FinishCap />

          {/* Completion CTA — pinned at the end of the chặng path. Marks
              the stage as done so the next chặng on /band-climber unlocks. */}
          <div className="flex flex-col items-center gap-2 pb-4">
            {completed ? (
              <>
                <div className="inline-flex items-center gap-2 rounded-full bg-sage-500 text-white px-5 py-2.5 font-extrabold uppercase tracking-wider text-sm shadow-md shadow-sage-500/30">
                  <Check className="h-4 w-4" /> Đã hoàn thành chặng
                </div>
                <Link
                  href="/band-climber"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  ← Về danh sách chặng để mở chặng tiếp theo
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={markComplete}
                  disabled={marking}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-6 py-3 font-extrabold uppercase tracking-wider text-sm shadow-md transition-all",
                    marking
                      ? "bg-sage-400 text-white cursor-wait"
                      : "bg-gradient-to-r from-sage-500 to-teal-600 hover:from-sage-600 hover:to-teal-700 text-white shadow-sage-500/30",
                  )}
                >
                  {marking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Đánh dấu hoàn thành chặng
                    </>
                  )}
                </button>
                <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                  Bấm khi đã làm xong các bài trên — chặng tiếp theo (band cao
                  hơn) sẽ tự động mở khoá.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {showTips && (
        <TipsDrawer
          tips={tips}
          onClose={() => setShowTips(false)}
          stageTitle={stage.title}
        />
      )}
    </div>
  );
}

function Hero({
  stage,
  onShowTips,
}: {
  stage: Stage;
  // null = admin disabled the HƯỚNG DẪN drawer on long-test surfaces, so we
  // don't render the button at all.
  onShowTips: (() => void) | null;
}) {
  return (
    <div className="sticky top-0 z-20 bg-gradient-to-r from-sage-500 to-teal-600 text-white shadow-md">
      <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/band-climber"
            className="text-[11px] uppercase tracking-widest opacity-90 inline-flex items-center gap-1 font-bold hover:opacity-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Vượt{" "}
            {stage.fromBand.toFixed(1)} → {stage.toBand.toFixed(1)}
          </Link>
          <h1 className="font-extrabold text-base sm:text-lg leading-tight mt-0.5 flex min-w-0 items-center gap-1.5">
            <Leaf className="h-4 w-4 shrink-0 text-white/80" />
            <span className="truncate">{stage.title}</span>
          </h1>
        </div>
        {onShowTips && (
          <button
            onClick={onShowTips}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl bg-white text-sage-700 px-3.5 py-2 shadow-md font-extrabold text-sm hover:bg-sage-50 active:translate-y-0.5"
          >
            <ListChecks className="h-4 w-4" /> HƯỚNG DẪN
          </button>
        )}
      </div>
    </div>
  );
}

function PathSection({
  group,
  currentId,
}: {
  group: PathGroup;
  currentId: string | undefined;
}) {
  const meta = SKILL_META[group.skill];
  const Icon = meta.icon;
  return (
    <div className="space-y-1">
      {/* Skill divider */}
      <div className="flex items-center gap-3 py-3">
        <div className="flex-1 h-px bg-border/70" />
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br text-white px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest shadow-md",
            meta.from,
            meta.to,
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {meta.label}
        </div>
        <div className="flex-1 h-px bg-border/70" />
      </div>

      {/* All exercises (long tests + mini-quizzes) flow inline in the same
          column. Each renders as PathNode (full size) or QuizNode (small
          violet) based on its `kind`. */}
      <div className="flex flex-col items-center gap-2 py-2">
        {group.exercises.map((ex, i) =>
          ex.kind === "quiz" ? (
            <QuizNode
              key={ex.id}
              ex={ex}
              indexInGroup={i}
              isCurrent={ex.id === currentId}
              isLastInGroup={i === group.exercises.length - 1}
            />
          ) : (
            <PathNode
              key={ex.id}
              ex={ex}
              skill={group.skill}
              indexInGroup={i}
              isCurrent={ex.id === currentId}
              isLastInGroup={i === group.exercises.length - 1}
            />
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Smaller violet node used for mini-quizzes — same zigzag layout idea as the
 * long-test PathNode but visually distinct (size, color, icon) so learners
 * immediately tell quick quizzes apart from the longer skill tests.
 */
function QuizNode({
  ex,
  indexInGroup,
  isCurrent,
  isLastInGroup,
}: {
  ex: PathExercise;
  indexInGroup: number;
  isCurrent: boolean;
  isLastInGroup: boolean;
}) {
  const offsetTable = [0, 48, 0, -48];
  const offsetX = offsetTable[indexInGroup % 4];
  return (
    <div
      className="relative my-2 flex flex-col items-center"
      style={{ marginLeft: offsetX }}
    >
      {isCurrent && <CurrentBubble />}
      <Link
        href={ex.href}
        title={ex.title}
        className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-honey/40 rounded-full"
      >
        <motion.div
          animate={
            isCurrent
              ? { y: [0, -6, 0], scale: [1, 1.04, 1] }
              : { y: 0, scale: 1 }
          }
          transition={
            isCurrent
              ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          className="relative"
        >
          <div
            className={cn(
              "grid h-14 w-14 place-items-center rounded-full border-[4px] border-white shadow-[0_6px_0_rgba(0,0,0,0.08)] transition-transform hover:scale-105 active:scale-100",
              "bg-gradient-to-br from-honey via-gold-400 to-honey-deep",
            )}
          >
            {isCurrent ? (
              <Play className="h-6 w-6 text-white fill-white" />
            ) : (
              <Brain className="h-6 w-6 text-white drop-shadow-sm" />
            )}
          </div>
        </motion.div>
      </Link>
      <span className="mt-1.5 max-w-[140px] text-center text-[10px] font-bold text-muted-foreground line-clamp-2">
        {ex.title}
        {ex.subtitle && (
          <span className="block text-honey-deep text-[9px] font-extrabold mt-0.5">
            {ex.subtitle}
          </span>
        )}
      </span>
      {!isLastInGroup && <div className="mt-1.5 h-2 w-1 rounded-full bg-honey-tint" />}
    </div>
  );
}

function PathNode({
  ex,
  skill,
  indexInGroup,
  isCurrent,
  isLastInGroup,
}: {
  ex: PathExercise;
  skill: SkillKey;
  indexInGroup: number;
  isCurrent: boolean;
  isLastInGroup: boolean;
}) {
  const meta = SKILL_META[skill];
  const Icon = meta.icon;
  // Zigzag pattern repeated every 4 nodes: 0 → +72 → 0 → -72 → 0…
  const offsetTable = [0, 72, 0, -72];
  const offsetX = offsetTable[indexInGroup % 4];
  // Every 4th exercise is a "milestone" trophy node instead of a plain skill node.
  const isMilestone = indexInGroup > 0 && indexInGroup % 4 === 3;

  return (
    <div
      className="relative my-3 flex flex-col items-center"
      style={{ marginLeft: offsetX }}
    >
      {isCurrent && <CurrentBubble />}
      <Link
        href={ex.href}
        title={ex.title}
        className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 rounded-full"
      >
        <motion.div
          animate={
            isCurrent
              ? { y: [0, -8, 0], scale: [1, 1.04, 1] }
              : { y: 0, scale: 1 }
          }
          transition={
            isCurrent
              ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          className="relative"
        >
          <div
            className={cn(
              "grid h-20 w-20 place-items-center rounded-full border-[5px] border-white shadow-[0_8px_0_rgba(0,0,0,0.08)] transition-transform hover:scale-105 active:scale-100",
              isCurrent
                ? "bg-gradient-to-br from-honey via-gold-400 to-honey-deep ring-4 ring-honey/40"
                : isMilestone
                  ? "bg-gradient-to-br from-gold-400 to-gold-500"
                  : cn("bg-gradient-to-br", meta.from, meta.to),
            )}
          >
            {isCurrent ? (
              <Play className="h-9 w-9 text-white fill-white" />
            ) : isMilestone ? (
              <Trophy className="h-9 w-9 text-white drop-shadow-sm" />
            ) : (
              <Icon className="h-9 w-9 text-white drop-shadow-sm" />
            )}
          </div>
          {/* Mini star badge under the node — like Duolingo's "stars earned" */}
          {!isCurrent && !isMilestone && (
            <Star className="absolute -bottom-1 right-0 h-5 w-5 text-gold-600 fill-gold-300 drop-shadow" />
          )}
        </motion.div>
      </Link>
      <span className="mt-2 max-w-[160px] text-center text-[11px] font-bold text-muted-foreground line-clamp-2">
        {ex.title}
      </span>
      {!isLastInGroup && (
        // dotted connector — visual link to the next node
        <div className="mt-2 h-3 w-1 rounded-full bg-border" />
      )}
    </div>
  );
}

function CurrentBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-2xl border-2 border-honey/50 bg-white px-3 py-1.5 text-xs font-extrabold text-honey-deep shadow-md whitespace-nowrap z-10"
    >
      HỌC VƯỢT?
      <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-r-2 border-b-2 border-honey/50 bg-white" />
    </motion.div>
  );
}

function FinishCap() {
  return (
    <div className="flex flex-col items-center pt-8 pb-2">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-muted to-muted border-[5px] border-white shadow-[0_6px_0_rgba(0,0,0,0.08)]">
        <Trophy className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="mt-3 text-xs font-bold text-muted-foreground text-center">
        Hoàn thành tất cả bài tập trong chặng để mở khoá band tiếp theo 🐝
      </p>
    </div>
  );
}

function TipsDrawer({
  tips,
  stageTitle,
  onClose,
}: {
  tips: TipsMd;
  stageTitle: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-card w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-sage-500 to-teal-600 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-80 font-bold">
              Hướng dẫn vượt band
            </div>
            <h2 className="font-extrabold text-lg leading-tight">{stageTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/20 hover:bg-white/30 text-white"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <StageView
            reading={tips.reading}
            listening={tips.listening}
            writing={tips.writing}
            speaking={tips.speaking}
          />
        </div>
      </div>
    </div>
  );
}
