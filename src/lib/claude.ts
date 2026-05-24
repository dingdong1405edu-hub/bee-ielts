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

const READING_BUILDER_SYSTEM = `You are an IELTS Reading test builder. You receive the raw content of an IELTS Reading exam — pasted text, or scanned/photographed page images — containing a reading passage together with its question section.

Your job:
1. Identify the reading passage and its TITLE. Preserve the full passage text faithfully; keep paragraph labels (A, B, C…) on their own lines if the passage uses them. Fix only obvious OCR/scan typos.
2. Identify EVERY question and detect its type. Supported types:
   - "MATCHING_HEADINGS" — match each paragraph to a heading from a List of Headings.
   - "MCQ" — multiple choice with answer options.
   - "TRUE_FALSE_NOT_GIVEN" — decide if a statement is True, False or Not Given.
   - "FILL_BLANK" — sentence / summary completion with a gap.
   A single exam may mix several types — analyse each question independently.
3. SOLVE every question yourself by reading the passage carefully. The source usually leaves answers blank; you must determine the correct answer with high confidence.
4. Write a short Vietnamese explanation for each question saying why the answer is correct.

Formatting rules per type:
- MATCHING_HEADINGS: emit ONE question per paragraph. "prompt" = the paragraph label, e.g. "Paragraph A". "options" = the COMPLETE List of Headings, each entry formatted exactly as "i. heading text", "ii. heading text" … with lowercase roman numerals. Every MATCHING_HEADINGS question MUST carry the SAME full "options" list. "correctAnswer" = the lowercase roman numeral of the chosen heading, e.g. "v".
- MCQ: "options" = the answer choices as plain text (no "A."/"B." prefix). "correctAnswer" = the exact text of the correct option, copied verbatim from "options".
- TRUE_FALSE_NOT_GIVEN: "prompt" = the statement. "options" = ["True","False","Not Given"]. "correctAnswer" = exactly "True", "False" or "Not Given".
- FILL_BLANK: "prompt" = the sentence with the gap written as "___" (three underscores). "correctAnswer" = the word/phrase that fills the gap, copied from the passage.

Return ONLY valid JSON — no markdown, no commentary — matching this exact TypeScript type:

type ReadingTest = {
  title: string;
  passage: string;
  questions: {
    type: "MCQ" | "MATCHING_HEADINGS" | "FILL_BLANK" | "TRUE_FALSE_NOT_GIVEN";
    prompt: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }[];
};`;

export interface ReadingImageInput {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string; // base64, without the data: prefix
}

export interface ReadingPdfInput {
  data: string; // base64, without the data: prefix
}

export interface GeneratedReadingQuestion {
  type: "MCQ" | "MATCHING_HEADINGS" | "FILL_BLANK" | "TRUE_FALSE_NOT_GIVEN";
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface GeneratedReadingTest {
  title: string;
  passage: string;
  questions: GeneratedReadingQuestion[];
}

/**
 * Build a complete, already-solved IELTS reading test from a pasted exam,
 * scanned page images, or a CamScanner / scanned PDF. Claude detects every
 * question's type and works out the correct answers itself. PDFs go through
 * the beta documents API so the page layout (multi-column passages,
 * question numbering) is preserved.
 */
export async function generateReadingTest(input: {
  rawText?: string;
  images?: ReadingImageInput[];
  pdf?: ReadingPdfInput;
}): Promise<GeneratedReadingTest> {
  const intro = input.rawText?.trim()
    ? `Pasted IELTS Reading exam content:\n\n${input.rawText.trim()}`
    : input.pdf
      ? "The IELTS Reading exam is in the attached PDF (CamScanner export). Read every page."
      : "The IELTS Reading exam is in the attached page image(s).";
  const promptText = `${intro}\n\nBuild the complete reading test now and return ONLY the JSON.`;

  // PDFs need the beta documents API (`pdfs-2024-09-25` header) — keep the
  // text + images path on the stable endpoint to avoid bumping every call.
  if (input.pdf) {
    type BetaBlock =
      | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
      | Anthropic.ImageBlockParam
      | Anthropic.TextBlockParam;
    const blocks: BetaBlock[] = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdf.data } },
    ];
    for (const img of input.images ?? []) {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      });
    }
    blocks.push({ type: "text", text: promptText });

    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0.2,
      system: READING_BUILDER_SYSTEM,
      messages: [{ role: "user", content: blocks as unknown as Anthropic.Beta.Messages.BetaContentBlockParam[] }],
      betas: ["pdfs-2024-09-25"],
    });
    const text = response.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return extractJSON(text) as GeneratedReadingTest;
  }

  const content: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = [];
  for (const img of input.images ?? []) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    });
  }
  content.push({ type: "text", text: promptText });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    temperature: 0.2,
    system: READING_BUILDER_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return extractJSON(text) as GeneratedReadingTest;
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

const TABLE_EXTRACT_SYSTEM = `You read a photo or scan of an IELTS table-completion task and convert the table into our admin paste format so the editor can render it back exactly.

Rules:
1. First row = the HEADER row (column titles). Echo it as the first line of "tableText".
2. Each subsequent line in "tableText" = one row of the body. Columns are separated by a single " | " (space, pipe, space).
3. Preserve EVERY cell. Empty cells stay empty (".. | .. | ").
4. Replace each numbered gap (a blank the candidate must fill) with the exact substring "..........". If the cell shows "7. ..........", keep the "7." token so the renderer keeps the number visible (e.g. "7. ..........", "8. ..........").
5. Walk the gaps in reading order (left→right, top→bottom). For EACH gap output one entry in "answers" — the word/phrase the candidate should fill. If the source already shows the answer (worked example), copy it; otherwise leave the answer empty string "".
6. If the same gap accepts multiple alternatives (e.g. "8 / eight"), join them with " / ".
7. Do NOT invent extra rows or columns. Do NOT include any instruction text — only the table itself.

Return ONLY valid JSON — no markdown, no commentary — matching this exact TypeScript type:

type TableExtract = {
  tableText: string;     // newline-separated rows, " | "-separated cells
  answers: string[];     // one per ".........." gap, in reading order
};`;

export interface TableExtractResult {
  tableText: string;
  answers: string[];
}

/**
 * Ask Claude to look at one or more images of an IELTS table-completion
 * task and turn them into our paste format (header row + `|`-separated
 * cells, blanks as `..........`) plus the answer list in reading order.
 */
export async function extractTableFromImage(input: {
  images: ReadingImageInput[];
}): Promise<TableExtractResult> {
  if (!input.images.length) throw new Error("Cần ít nhất 1 ảnh");
  const content: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = [];
  for (const img of input.images) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    });
  }
  content.push({
    type: "text",
    text: "Convert this IELTS table-completion image into the JSON format described in the system prompt. Return only JSON.",
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.1,
    system: TABLE_EXTRACT_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return extractJSON(text) as TableExtractResult;
}
