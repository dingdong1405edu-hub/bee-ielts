import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MockReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

export default async function MockReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const attempt = await prisma.mockAttempt.findUnique({
    where: { id: attemptId },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Về hồ sơ
      </Link>

      <MockReviewClient
        attempt={{
          id: attempt.id,
          completedAt: attempt.completedAt.toISOString(),
          overallBand: attempt.overallBand,
          summary: attempt.summary,
          feedbackDoc: attempt.feedbackDoc,
          listeningBand: attempt.listeningBand,
          listeningCorrect: attempt.listeningCorrect,
          listeningTotal: attempt.listeningTotal,
          listeningPayload: attempt.listeningPayload as unknown as ListeningPayload,
          readingBand: attempt.readingBand,
          readingCorrect: attempt.readingCorrect,
          readingTotal: attempt.readingTotal,
          readingPayload: attempt.readingPayload as unknown as ReadingPayload,
          writingBand: attempt.writingBand,
          writingPayload: attempt.writingPayload as unknown as WritingPayload,
          speakingBand: attempt.speakingBand,
          speakingPayload: attempt.speakingPayload as unknown as SpeakingPayload,
        }}
      />
    </div>
  );
}

// Shapes mirror what /api/mock/complete writes — kept inline so the
// client component can stay strongly typed.
export interface ReviewQuestion {
  id: string;
  testId: string;
  type: string;
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  displayNumber: number | null;
  formGroup: string | null;
}
export interface ListeningPayload {
  tests: { id: string; title: string; audioUrl: string; transcript: string | null; section: number | null }[];
  questions: ReviewQuestion[];
  answers: Record<string, string>;
}
export interface ReadingPayload {
  passages: { id: string; title: string; passage: string; imageUrl: string | null; level: string }[];
  questions: ReviewQuestion[];
  answers: Record<string, string>;
}
export interface WritingPayload {
  task1: {
    id: string;
    taskType: number;
    prompt: string;
    imageUrl: string | null;
    diagramSvg: string | null;
    essay: string;
    band: number;
    summary: string;
    ai: WritingAi | null;
  };
  task2: {
    id: string;
    taskType: number;
    prompt: string;
    imageUrl: string | null;
    essay: string;
    band: number;
    summary: string;
    ai: WritingAi | null;
  };
  combinedFeedback: string;
}
export interface WritingAi {
  overallBand?: number;
  criteria?: Record<string, { band: number; feedback: string }>;
  annotations?: { category?: string; excerpt: string; issue: string; suggestion: string }[];
  improvedVersion?: string;
  summary?: string;
}
export interface SpeakingPayload {
  setId: string;
  topic: string;
  imageUrl: string | null;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
  transcripts: { "1": string; "2": string; "3": string };
  band: number;
  summary: string;
  ai: SpeakingAi | null;
}
export interface SpeakingAi {
  overallBand?: number;
  criteria?: Record<string, { band: number; feedback: string }>;
  observations?: string[];
  corrections?: { original: string; corrected: string; explanation: string }[];
  pronunciationFixes?: { word: string; ipa: string; tip: string }[];
  questionTips?: {
    question: string;
    band?: number;
    criteria?: {
      fluencyCoherence?: number;
      lexicalResource?: number;
      grammaticalRange?: number;
      pronunciation?: number;
    };
    transcript?: string;
    opener?: string;
    advice?: string;
  }[];
  summary?: string;
}
