"use client";

/**
 * HomeworkSpeaking — a SPEAKING assignment for a student, now driven by the SAME
 * examiner-style player + result screen as the practice module. A student runs
 * the full SpeakingPlayer (AI reads each question, auto-records, waveform) and
 * gets the identical rich review. Revisiting an already-graded submission shows
 * that same review from the stored feedback (minus audio — the app never stores
 * recordings). A teacher/admin previews the exact student player in previewMode
 * (grades through the practice endpoint, nothing is persisted).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignmentLocked } from "@/components/learn/assignment-locked";
import { SpeakingPlayer, type HomeworkConfig } from "@/app/(learn)/speaking/[setId]/speaking-player";
import {
  SpeakingResultView,
  type SpeakingResult,
  type SpeakingReviewItem,
} from "@/components/learn/speaking-result-view";
import { playExaminerLine } from "@/lib/tts";

interface SpeakingConfig {
  part?: number;
  topic?: string;
  questions?: string[];
}

const EXIT_HREF = "/classes";

/** A minimal well-formed result, so the revisit review never crashes on an old
 *  submission whose stored feedback is missing a field. */
function emptyResult(): SpeakingResult {
  return {
    overallBand: 0,
    criteria: {
      fluencyCoherence: { band: 0, feedback: "" },
      lexicalResource: { band: 0, feedback: "" },
      grammaticalRange: { band: 0, feedback: "" },
      pronunciation: { band: 0, feedback: "" },
    },
    observations: [],
    summary: "",
  };
}

export function HomeworkSpeaking({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ title: string; className: string } | null>(null);
  const [cfg, setCfg] = useState<SpeakingConfig>({});
  const [locked, setLocked] = useState<{ openAt: string | null } | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [attempts, setAttempts] = useState({ allowed: 1, count: 0 });
  // A prior graded submission → the revisit review (rich, from stored feedback).
  const [prior, setPrior] = useState<{ band: number; feedback: SpeakingResult; transcript: string } | null>(null);
  // After "Làm lại" we drop the prior review and mount a fresh player run.
  const [retaking, setRetaking] = useState(false);

  // TTS for the revisit review's speaker buttons (same Aurora voice as the player).
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speak = useCallback((t: string) => {
    void playExaminerLine(t, "aurora", audioRef);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được bài");
        if (!alive) return;
        const c = (data.assignment.config?.speaking as SpeakingConfig) ?? {};
        setMeta({ title: data.assignment.title, className: data.assignment.className });
        setCfg(c);
        setIsManager(Boolean(data.isManager));
        setAttempts({
          allowed: data.assignment.attemptsAllowed ?? 1,
          count: data.submission?.attemptCount ?? 0,
        });
        if (data.locked) setLocked({ openAt: data.assignment.openAt });
        else if (data.alreadySubmitted && data.submission) {
          setPrior({
            band: data.submission.totalScore ?? 0,
            feedback: (data.submission.feedback as SpeakingResult) ?? emptyResult(),
            transcript: data.submission.transcript ?? "",
          });
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Lỗi tải bài");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-lg">
        <CardContent className="space-y-3 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="font-semibold">{error}</p>
          <Button variant="outline" onClick={() => router.back()}>
            Quay lại
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (locked) {
    return <AssignmentLocked title={meta?.title ?? ""} className={meta?.className ?? ""} openAt={locked.openAt} />;
  }

  const part = (cfg.part === 2 ? 2 : cfg.part === 3 ? 3 : 1) as 1 | 2 | 3;
  const questions = cfg.questions ?? [];
  const canRetry = attempts.allowed === 0 || attempts.count < attempts.allowed;

  // Revisit a graded submission → the identical practice review (audio isn't
  // stored, so showAudio is off and the transcript is shown as one block).
  if (prior && !retaking) {
    const items: SpeakingReviewItem[] = prior.transcript.trim()
      ? [{ key: "all", label: `Part ${part}`, result: { transcript: prior.transcript, words: [] } }]
      : [];
    const footer = (
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {canRetry && (
          <Button variant="brand" size="lg" className="rounded-full" onClick={() => setRetaking(true)}>
            Làm lại ({attempts.allowed === 0 ? "không giới hạn" : `còn ${Math.max(0, attempts.allowed - attempts.count)} lượt`})
          </Button>
        )}
        <Button variant="outline" size="lg" className="rounded-full" onClick={() => router.push(EXIT_HREF)}>
          Về lớp học
        </Button>
      </div>
    );
    return (
      <div className="pb-10">
        <SpeakingResultView
          result={{ ...emptyResult(), ...prior.feedback, overallBand: prior.feedback.overallBand ?? prior.band }}
          topic={cfg.topic ?? ""}
          items={items}
          onSpeak={speak}
          showAudio={false}
          footer={footer}
        />
      </div>
    );
  }

  const homework: HomeworkConfig = {
    assignmentId,
    partLabel: part,
    attemptsAllowed: attempts.allowed,
    attemptCount: attempts.count,
    exitHref: EXIT_HREF,
    previewMode: isManager,
  };

  return (
    <SpeakingPlayer
      setId=""
      topic={cfg.topic ?? meta?.title ?? ""}
      part1Questions={questions}
      part2CueCard={{ topic: cfg.topic ?? "", points: [] }}
      part3Questions={[]}
      homework={homework}
      onExit={() => router.push(EXIT_HREF)}
    />
  );
}
