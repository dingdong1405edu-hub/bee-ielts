import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

export const MODEL = "claude-sonnet-4-5-20250929";

const WRITING_SYSTEM = `You are a certified IELTS examiner with 10+ years of experience.
You score essays strictly using official IELTS band descriptors (0–9 in 0.5 increments).
You evaluate four criteria for Writing Task 1 (Academic) and Task 2:
- Task Achievement / Task Response (TR/TA)
- Coherence & Cohesion (CC)
- Lexical Resource (LR)
- Grammatical Range & Accuracy (GRA)

Be honest, specific, and constructive. Quote short excerpts from the essay when giving feedback.
Return ONLY valid JSON matching this exact TypeScript type — no markdown, no commentary:

type WritingResult = {
  overallBand: number;
  criteria: {
    taskAchievement: { band: number; feedback: string };
    coherenceCohesion: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
  };
  annotations: { excerpt: string; issue: string; suggestion: string }[];
  improvedVersion: string;
  summary: string;
};`;

const SPEAKING_SYSTEM = `You are a certified IELTS Speaking examiner.
You score IELTS Speaking responses (Part 1, 2, or 3) using official band descriptors.
You evaluate four criteria:
- Fluency & Coherence (FC)
- Lexical Resource (LR)
- Grammatical Range & Accuracy (GRA)
- Pronunciation (PR) — note: based on transcript only, you can only assess what is reflected through word choice, filler words, hesitations, and clarity of phrasing. Add a note about this limitation.

Return ONLY valid JSON matching this exact TypeScript type:

type SpeakingResult = {
  overallBand: number;
  criteria: {
    fluencyCoherence: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
    pronunciation: { band: number; feedback: string; note: string };
  };
  observations: string[];
  improvedSample: string;
  summary: string;
};`;

const STUDY_PLAN_SYSTEM = `You are an experienced IELTS coach building a personalised weekly study roadmap for a Vietnamese learner.

You receive: the learner's target band, weeks until exam, how many days per week they can study, and their recent performance per skill (if any).

Design ONE representative week of study — exactly one session per available day. Prioritise the learner's WEAKEST skills (lowest recent band, or skills never practised). Across the week, still touch all four IELTS skills plus vocabulary/grammar. Each session focuses on ONE main skill.

Write everything in Vietnamese. Every "note" must be a CONCRETE, actionable study-method tip — never generic encouragement.

Return ONLY valid JSON matching this exact TypeScript type — no markdown, no commentary:

type StudyPlan = {
  overview: string;          // 1-2 sentences, personalised + motivating, Vietnamese
  weeklyTemplate: {
    skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR";
    title: string;           // short Vietnamese task title
    note: string;            // one concrete method tip, Vietnamese
  }[];
  examPrepAdvice: string;    // Vietnamese advice for the final 2 weeks (mock-test phase)
};

weeklyTemplate MUST contain exactly the requested number of entries.`;

export interface StudyPlanInput {
  targetBand: number;
  weeksUntilExam: number;
  hasExamDate: boolean;
  daysPerWeek: number;
  skillScores: { skill: string; avgBand: number; attempts: number }[];
}

export interface StudyPlanResult {
  overview: string;
  weeklyTemplate: { skill: string; title: string; note: string }[];
  examPrepAdvice: string;
}

/** Ask Claude for a personalised weekly study template tailored to the learner. */
export async function generateStudyPlan(input: StudyPlanInput): Promise<StudyPlanResult> {
  const perf =
    input.skillScores.length > 0
      ? input.skillScores
          .map((s) => `- ${s.skill}: band trung bình ${s.avgBand.toFixed(1)} (${s.attempts} lần luyện)`)
          .join("\n")
      : "Chưa có dữ liệu luyện tập — coi như người mới, cân bằng mọi kỹ năng.";

  const userMessage = `Thông tin người học:
- Mục tiêu: band ${input.targetBand.toFixed(1)}
- ${input.hasExamDate ? `Còn ${input.weeksUntilExam} tuần đến ngày thi` : `Chưa đặt ngày thi — lập kế hoạch ${input.weeksUntilExam} tuần`}
- Học ${input.daysPerWeek} buổi/tuần

Kết quả luyện tập gần đây:
${perf}

Hãy thiết kế weeklyTemplate gồm đúng ${input.daysPerWeek} buổi và trả về JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.6,
    system: STUDY_PLAN_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return extractJSON(text) as StudyPlanResult;
}

export interface WritingGradeInput {
  taskType: 1 | 2;
  prompt: string;
  essay: string;
}

export interface SpeakingGradeInput {
  part: 1 | 2 | 3;
  topic: string;
  questions: string[];
  transcript: string;
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function gradeWriting(input: WritingGradeInput) {
  const userMessage = `IELTS Writing Task ${input.taskType}

PROMPT:
${input.prompt}

CANDIDATE'S ESSAY:
${input.essay}

Please grade this essay and return the JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    temperature: 0.3,
    system: WRITING_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return extractJSON(text);
}

export async function gradeSpeaking(input: SpeakingGradeInput) {
  const userMessage = `IELTS Speaking — Part ${input.part}
TOPIC: ${input.topic}

QUESTIONS:
${input.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

CANDIDATE'S TRANSCRIPT:
${input.transcript}

Please grade and return the JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    temperature: 0.3,
    system: SPEAKING_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return extractJSON(text);
}
