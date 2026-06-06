"use client";
import { useEffect, useState } from "react";
import {
  ListeningShell,
  type ListeningPart,
  type ShellListeningQ,
} from "@/components/learn/listening-shell";

const REVIEW_SECONDS = 10 * 60;

type Q = ShellListeningQ;

interface Section {
  id: string;
  title: string;
  section: number;
  audioUrl: string;
  imageUrl?: string | null;
  contentImageUrl?: string | null;
  transcript: string | null;
  questions: Q[];
}

/**
 * Mock Listening — real IELTS flow:
 *   1. Sections 1→4 are played ONE AT A TIME via the shared ListeningShell.
 *      Each section's audio plays a single time (play-once lock), then the
 *      candidate advances to the next section via the shell's part-nav.
 *   2. After Section 4, the candidate enters a 10-minute REVIEW phase. All
 *      4 sections' questions are visible in one scroll for final touches.
 *      Audio is permanently locked; a 10-minute countdown auto-submits.
 *
 * The actual chrome (brand bar, audio strip, part tabs, floating arrows)
 * is owned by ListeningShell — this component just wires up the data and
 * the IELTS-specific rules (forward-only, play-once, 10-min review).
 */
export function MockListening({
  sections,
  onDone,
}: {
  sections: Section[];
  /** Kept for backward compat with MockRunner; not used. */
  timeLimit?: number;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [phase, setPhase] = useState<"playing" | "reviewing">("playing");
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  const [reviewLeft, setReviewLeft] = useState(REVIEW_SECONDS);

  // 10-min review countdown only — no global timer during playback.
  useEffect(() => {
    if (phase !== "reviewing") return;
    const t = setInterval(() => {
      setReviewLeft((r) => {
        if (r <= 1) {
          clearInterval(t);
          onDone(answers);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Continuous numbering across the 4 sections (Q1–40 in a real IELTS).
  const sectionOffsets: number[] = [];
  {
    let off = 1;
    for (const s of sections) {
      sectionOffsets.push(off);
      off += s.questions.length;
    }
  }

  // Build the shell's parts[] array — one part per IELTS section.
  const parts: ListeningPart[] = sections.map((s, i) => ({
    id: s.id,
    index: s.section ?? i + 1,
    startNum: sectionOffsets[i],
    title: `Part ${s.section ?? i + 1}`,
    audioUrl: s.audioUrl,
    transcript: s.transcript,
    contentImageUrl: s.contentImageUrl ?? s.imageUrl ?? null,
    questions: s.questions,
    instructions: s.title || null,
  }));

  // Mark a part as played → audio is locked from now on. We add to the
  // shared `playedIds` so even after entering the review phase the part
  // remains locked (the parent's state survives the remount).
  const markPlayed = (id: string) =>
    setPlayedIds((s) => {
      if (s.has(id)) return s;
      const next = new Set(s);
      next.add(id);
      return next;
    });

  // When the candidate moves forward via the shell's part nav, the previous
  // section becomes locked even if its audio never finished (they chose to
  // advance). This matches the original "Sang Section X →" behaviour.
  const handlePartChange = (next: number) => {
    if (next <= activeIdx) return; // forward-only enforced
    if (next > activeIdx) {
      // Lock everything between current and next, inclusive of current.
      setPlayedIds((s) => {
        const out = new Set(s);
        for (let i = activeIdx; i < next; i++) out.add(sections[i].id);
        return out;
      });
    }
    // Advancing past the last section flips to the 10-min review phase.
    if (next >= sections.length) {
      setPhase("reviewing");
      return;
    }
    setActiveIdx(next);
  };

  // In review phase, ALL parts are unlocked for navigation but ALL audios
  // are locked — the shell hides the scrubber and shows "Đã khoá audio".
  if (phase === "reviewing") {
    const allLocked = new Set(sections.map((s) => s.id));
    return (
      <ListeningShell
        title="Listening Mock Test — 10 phút kiểm tra"
        brandName="Bee IELTS"
        parts={parts}
        activeIdx={activeIdx}
        onActiveIdxChange={setActiveIdx}
        answers={answers}
        onChangeAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
        onSubmit={() => onDone(answers)}
        submitLabel="Nộp & sang Reading"
        playOnce
        lockedPartIds={allLocked}
        remainingSec={reviewLeft}
      />
    );
  }

  // Playing phase — forward-only, play-once per section. The submit button
  // advances one section at a time; only when we're on the LAST section
  // does it flip the phase to the 10-minute review. Previously this had
  // a bug where any click on submit jumped straight to review, skipping
  // sections 2–4. Now intermediate sections route through handlePartChange
  // (same path the bottom part-nav uses) so the IELTS forward-only rule
  // applies uniformly.
  const advance = () => {
    if (activeIdx === sections.length - 1) {
      // Lock the final section's audio too before entering review.
      markPlayed(sections[activeIdx].id);
      setActiveIdx(0); // start review from Part 1 so the learner re-scans top to bottom
      setPhase("reviewing");
    } else {
      handlePartChange(activeIdx + 1);
    }
  };

  return (
    <ListeningShell
      title="Listening Mock Test"
      brandName="Bee IELTS"
      parts={parts}
      activeIdx={activeIdx}
      onActiveIdxChange={handlePartChange}
      answers={answers}
      onChangeAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
      onSubmit={advance}
      submitLabel={
        activeIdx === sections.length - 1
          ? "Sang kiểm tra (10:00)"
          : `Sang Section ${activeIdx + 2}`
      }
      playOnce
      lockedPartIds={playedIds}
      forwardOnly
      onPartEnded={markPlayed}
      remainingSec={null}
      elapsedSec={0}
    />
  );
}
