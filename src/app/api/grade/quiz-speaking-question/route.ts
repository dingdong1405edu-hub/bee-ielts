import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { gradeQuizSpeakingQuestionGroq } from "@/lib/groq";

const schema = z.object({
  question: z.string().min(1),
  transcript: z.string(),
  lowConfidenceWords: z.array(z.string()).optional(),
  // Admin-authored explanation/hint on the MiniQuestion — passed through to
  // the grader prompt so the AI knows what the question is actually testing
  // (e.g. "target band 5.5, focus on past tense"). Empty / undefined = no
  // hint added.
  hint: z.string().optional(),
});

// Returned when the transcript is too short or empty to grade — same shape as
// the Groq grader output so the client doesn't have to branch.
function ungradeable() {
  return {
    quickBand: 0,
    summary: "Không nghe được câu trả lời — thử nói to và rõ hơn.",
    pronunciationFixes: [],
    grammarFixes: [],
    betterPhrasing: "",
  };
}

/**
 * Per-question Vượt-band SPEAKING quiz grader. Returns a compact JSON the
 * mini-quiz player renders inline in the verdict bar right after the
 * candidate hits "Hoàn thành" on a SPEAKING question. Cheaper + faster than
 * the full /api/grade/speaking pipeline because it scopes the prompt to one
 * answer.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  const { question, transcript, lowConfidenceWords, hint } = parsed.data;
  if (transcript.trim().length < 10) {
    return NextResponse.json({ result: ungradeable() });
  }

  try {
    const result = await gradeQuizSpeakingQuestionGroq({
      question,
      transcript,
      lowConfidenceWords,
      hint,
    });
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[grade/quiz-speaking-question]", e);
    return NextResponse.json({
      result: {
        quickBand: 0,
        summary: "AI không chấm được — thử lại sau.",
        pronunciationFixes: [],
        grammarFixes: [],
        betterPhrasing: "",
      },
    });
  }
}

export const maxDuration = 30;
