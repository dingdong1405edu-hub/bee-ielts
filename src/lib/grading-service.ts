/**
 * GradingService — auto-grades a student's assignment submission.
 *
 * Flow (called from POST /api/submissions):
 *   1. Query the assignment's questions + correct answers from the DB.
 *   2. Loop comparing student_answer vs correct_answer. ONLY objective
 *      Reading / Listening questions are auto-graded (a Question is Reading
 *      when it has readingId, Listening when it has listeningId). Anything
 *      else — Writing/Speaking prompts etc. — is skipped (needs AI/human).
 *   3. Convert the raw correct count to an IELTS Band score (Academic Reading
 *      + Listening conversion tables, scaled to the /40 standard).
 *   4. Update the Submission: status = GRADED, totalScore = band.
 *   5. Return the structured result to the caller (→ frontend).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAnswerCorrect } from "@/lib/utils";

export interface StudentAnswer {
  questionId: string;
  answer: string;
}
export interface CheatLogs {
  count: number;
  events: { type: string; at: string }[];
}
type Skill = "READING" | "LISTENING" | "OTHER";

export interface GradeResult {
  /** IELTS band (0–9, 0.5 steps) — stored as Submission.totalScore. */
  band: number;
  /** Correct out of the auto-graded (Reading/Listening) questions. */
  correctCount: number;
  /** How many questions were auto-graded (Reading + Listening). */
  autoGradedCount: number;
  /** Total questions in the assignment (incl. skipped non-R/L ones). */
  totalQuestions: number;
  /** Questions skipped because they aren't Reading/Listening. */
  skippedCount: number;
  /** % correct over the auto-graded questions. */
  scorePercent: number;
  /** Per-skill split so the UI can show a Reading/Listening breakdown. */
  breakdown: {
    reading: { correct: number; total: number; band: number };
    listening: { correct: number; total: number; band: number };
  };
}

type BandRow = [minRaw40: number, band: number];

// IELTS Academic READING raw(/40) → band (standard approximate table).
const READING_TABLE: BandRow[] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [1, 1],
];
// IELTS LISTENING raw(/40) → band.
const LISTENING_TABLE: BandRow[] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [10, 4], [6, 3.5], [4, 3], [3, 2.5], [2, 2], [1, 1],
];

/** Convert correct/total to a band via a table, scaling to the /40 standard. */
function bandFromRaw(correct: number, total: number, table: BandRow[]): number {
  if (total <= 0) return 0;
  const raw40 = (correct / total) * 40;
  for (const [minRaw, band] of table) {
    if (raw40 >= minRaw) return band;
  }
  return 0;
}

/** Round to the nearest 0.5 (IELTS bands step by half). */
function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function coerceKey(correctAnswer: Prisma.JsonValue | null): string {
  return typeof correctAnswer === "string" ? correctAnswer : String(correctAnswer ?? "");
}

/**
 * Paper-mode assignments (teacher-uploaded PDF/MP3 + answer key) hold custom
 * questions that belong to no ReadingTest/ListeningTest — so they have neither
 * readingId nor listeningId. The assignment declares which skill they are via
 * `config.paper.skill`; read it so those questions can still be auto-graded.
 */
function paperSkill(config: Prisma.JsonValue | null | undefined): "READING" | "LISTENING" | null {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const paper = (config as Record<string, unknown>).paper;
    if (paper && typeof paper === "object" && !Array.isArray(paper)) {
      const s = (paper as Record<string, unknown>).skill;
      if (s === "READING" || s === "LISTENING") return s;
    }
  }
  return null;
}

export const GradingService = {
  /**
   * Pure grading — no DB writes. Fetches the assignment's questions + answer
   * key, grades the Reading/Listening ones against `answers`, and returns the
   * band + breakdown.
   */
  async grade(assignmentId: string, answers: StudentAnswer[]): Promise<GradeResult> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { questionIds: true, config: true },
    });
    const questionIds = assignment?.questionIds ?? [];
    // Fallback skill for teacher paper-mode questions (no readingId/listeningId).
    const fallbackSkill = paperSkill(assignment?.config);

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, type: true, correctAnswer: true, readingId: true, listeningId: true },
    });

    const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));
    const reading = { correct: 0, total: 0 };
    const listening = { correct: 0, total: 0 };

    for (const q of questions) {
      let skill: Skill = q.readingId ? "READING" : q.listeningId ? "LISTENING" : "OTHER";
      // Paper-mode custom questions carry no test id → grade under the
      // assignment's declared paper skill instead of skipping them.
      if (skill === "OTHER" && fallbackSkill) skill = fallbackSkill;
      // Only Reading & Listening are auto-graded.
      if (skill === "OTHER") continue;
      const bucket = skill === "READING" ? reading : listening;
      bucket.total += 1;
      if (isAnswerCorrect(answerMap.get(q.id), coerceKey(q.correctAnswer), q.type)) {
        bucket.correct += 1;
      }
    }

    const readingBand = bandFromRaw(reading.correct, reading.total, READING_TABLE);
    const listeningBand = bandFromRaw(listening.correct, listening.total, LISTENING_TABLE);

    // Overall band = per-skill bands weighted by question count, half-rounded.
    const parts: { band: number; count: number }[] = [];
    if (reading.total > 0) parts.push({ band: readingBand, count: reading.total });
    if (listening.total > 0) parts.push({ band: listeningBand, count: listening.total });
    let band = 0;
    if (parts.length > 0) {
      const weighted = parts.reduce((s, p) => s + p.band * p.count, 0);
      const counts = parts.reduce((s, p) => s + p.count, 0);
      band = roundHalf(weighted / counts);
    }

    const correctCount = reading.correct + listening.correct;
    const autoGradedCount = reading.total + listening.total;

    return {
      band,
      correctCount,
      autoGradedCount,
      totalQuestions: questions.length,
      skippedCount: questions.length - autoGradedCount,
      scorePercent: autoGradedCount > 0 ? Math.round((correctCount / autoGradedCount) * 1000) / 10 : 0,
      breakdown: {
        reading: { ...reading, band: readingBand },
        listening: { ...listening, band: listeningBand },
      },
    };
  },

  /**
   * Grade + persist: writes the Submission (status=GRADED, totalScore=band,
   * plus the student's answers and proctoring cheat_logs) and returns the
   * result. Used right after the student submits.
   */
  async gradeSubmission(input: {
    assignmentId: string;
    studentId: string;
    answers: StudentAnswer[];
    cheatLogs?: CheatLogs;
    /** Which attempt this is (1-based). Stored on Submission.attemptCount. */
    attemptCount?: number;
  }): Promise<GradeResult> {
    const result = await this.grade(input.assignmentId, input.answers);
    const cheat = input.cheatLogs ?? { count: 0, events: [] };

    const gradeData = {
      status: "GRADED" as const,
      totalScore: result.band,
      answers: input.answers as unknown as Prisma.InputJsonValue,
      submittedAt: new Date(),
      cheatLogs: cheat as unknown as Prisma.InputJsonValue,
      attemptCount: input.attemptCount ?? 1,
    };
    await prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId },
      },
      create: { assignmentId: input.assignmentId, studentId: input.studentId, ...gradeData },
      update: gradeData,
    });

    return result;
  },
};
