const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export async function groqChat(messages: GroqMessage[], opts: GroqOptions = {}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 2500,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

/**
 * Moderate an image with a Groq vision model.
 * Returns { safe: false } if the image looks inappropriate for a learning
 * community (nudity, sexual content, violence/gore, weapons, drugs, hate
 * symbols, etc.). On any error the caller should treat the image as unsafe.
 */
export async function moderateImageGroq(dataUrl: string): Promise<{ safe: boolean; reason: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const prompt = `You are moderating images for a Vietnamese English-learning community used by students.
Look at the image and decide if it is appropriate.
Mark it UNSAFE if it contains ANY of: nudity or sexual/suggestive content, violence, blood or gore, weapons used threateningly, drugs, hate symbols, gambling, or anything inappropriate or provocative for students.
Mark it SAFE for ordinary photos: study notes, screenshots, scenery, food, pets, memes that are clean, people fully clothed in normal situations.
Reply ONLY with JSON: {"safe": true|false, "reason": "<short reason>"}`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Groq vision ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const raw = data.choices[0]?.message?.content ?? "";
  const parsed = extractJSON(raw) as { safe?: boolean; reason?: string };
  return { safe: parsed.safe === true, reason: parsed.reason ?? "" };
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in response");
  return JSON.parse(trimmed.slice(start, end + 1));
}

const WRITING_SYS = `You are a certified IELTS examiner. Score essays using official IELTS band descriptors (0–9 in 0.5 increments).
Evaluate 4 criteria for Writing Task 1 or Task 2:
- Task Achievement / Task Response
- Coherence & Cohesion
- Lexical Resource
- Grammatical Range & Accuracy

SCORING RULE: If the essay is empty, off-topic, or fewer than ~30 words, give overallBand 0 and all criteria 0.

Be honest, specific, constructive. Feedback text MUST be in Vietnamese (quotes/examples stay in English).
Return ONLY valid JSON matching this exact shape:

{
  "overallBand": 6.5,
  "criteria": {
    "taskAchievement": { "band": 6, "feedback": "<tiếng Việt>" },
    "coherenceCohesion": { "band": 7, "feedback": "<tiếng Việt>" },
    "lexicalResource": { "band": 6, "feedback": "<tiếng Việt>" },
    "grammaticalRange": { "band": 6.5, "feedback": "<tiếng Việt>" }
  },
  "annotations": [
    { "category": "grammar" | "vocabulary" | "coherence" | "task", "excerpt": "<câu/cụm sai trích từ bài>", "issue": "<lỗi gì — tiếng Việt>", "suggestion": "<sửa thế nào — tiếng Việt, kèm bản đúng>" }
  ],
  "linkingPhrases": [
    { "phrase": "<cụm từ nối tiếng Anh>", "use": "<dùng khi nào — tiếng Việt>" }
  ],
  "usefulStructures": [
    { "structure": "<cấu trúc câu tiếng Anh>", "example": "<câu ví dụ tiếng Anh>", "note": "<giải thích ngắn — tiếng Việt>" }
  ],
  "openingSentences": ["<2-3 câu mở đoạn hay, tiếng Anh, phù hợp đề bài này>"],
  "closingSentences": ["<2-3 câu kết đoạn hay, tiếng Anh, phù hợp đề bài này>"],
  "improvedVersion": "<bài viết mẫu hoàn chỉnh band 7.0-7.5 cho đúng đề bài này>",
  "summary": "<nhận xét tổng quan ngắn — tiếng Việt>"
}

Provide 4-8 annotations, 5-7 linkingPhrases, 4-6 usefulStructures. If the essay is empty give empty annotation/structure arrays but STILL provide linkingPhrases, openingSentences, closingSentences and improvedVersion as study material.`;

const SPEAKING_SYS = `You are a certified IELTS Speaking examiner. Score speaking responses (Part 1, 2, or 3) using official band descriptors.
Evaluate 4 criteria:
- Fluency & Coherence
- Lexical Resource
- Grammatical Range & Accuracy
- Pronunciation (based on transcript only — note this limitation)

Return ONLY valid JSON:

{
  "overallBand": 6.5,
  "criteria": {
    "fluencyCoherence": { "band": 6, "feedback": "..." },
    "lexicalResource": { "band": 7, "feedback": "..." },
    "grammaticalRange": { "band": 6, "feedback": "..." },
    "pronunciation": { "band": 6, "feedback": "...", "note": "Assessed from transcript only — limited signal." }
  },
  "observations": ["...", "..."],
  "improvedSample": "...",
  "summary": "..."
}`;

const TIPS_SYS = `You are a friendly IELTS coach giving practical actionable tips. Tone: warm, Gen-Z friendly. Write in Vietnamese.
Return ONLY valid JSON:

{
  "tips": [{ "title": "<≤60 chars>", "detail": "<≤200 chars>" }],
  "encouragement": "<short Vietnamese encouragement>"
}

Return 3-4 tips total.`;

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

export async function gradeWritingGroq(input: WritingGradeInput): Promise<unknown> {
  const userMessage = `IELTS Writing Task ${input.taskType}

PROMPT:
${input.prompt}

CANDIDATE'S ESSAY:
${input.essay}

Score this essay and return JSON only.`;

  const text = await groqChat(
    [
      { role: "system", content: WRITING_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.3, maxTokens: 2500 },
  );
  return extractJSON(text);
}

export async function gradeSpeakingGroq(input: SpeakingGradeInput): Promise<unknown> {
  const userMessage = `IELTS Speaking — Part ${input.part}
TOPIC: ${input.topic}

QUESTIONS:
${input.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

CANDIDATE TRANSCRIPT:
${input.transcript}

Score and return JSON only.`;

  const text = await groqChat(
    [
      { role: "system", content: SPEAKING_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.3, maxTokens: 2500 },
  );
  return extractJSON(text);
}

const READING_EXPLAIN_SYS = `You are an IELTS Reading teacher writing in Vietnamese for Vietnamese learners.
For each question, return a detailed explanation in JSON:

{
  "quote": "<exact short excerpt copied verbatim from the passage that contains the answer — keep under 60 words>",
  "keywords": ["<list of 2-5 short key phrases from the QUOTE that are most important for choosing the answer>"],
  "translation": "<accurate Vietnamese translation of the quote>",
  "reasoning": "<Vietnamese explanation: chỉ rõ đoạn nào trong bài chứa thông tin, tại sao đáp án đúng khớp, nếu là MCQ/Matching, ngắn gọn vì sao các phương án khác không đúng>",
  "mistake": "<Optional Vietnamese — ONLY IF the user's answer is wrong: phân tích cụ thể tại sao đáp án người dùng sai, lỗi tư duy gì khiến họ chọn đáp án đó, và cách tránh lỗi này lần sau. Để '' nếu user đúng.>"
}

Rules:
- The quote MUST be a literal substring of the passage (same casing, same punctuation).
- Keywords MUST be substrings of the quote.
- All text in Vietnamese only (quote stays in English).
- Return ONLY valid JSON.`;

export interface ReadingExplainInput {
  passage: string;
  questionPrompt: string;
  questionType: string;
  options?: string[] | null;
  correctAnswer: string;
  userAnswer?: string;
}

export interface ReadingExplainResult {
  quote: string;
  keywords: string[];
  translation: string;
  reasoning: string;
  mistake?: string;
}

export async function explainReadingGroq(input: ReadingExplainInput): Promise<ReadingExplainResult> {
  const isWrong =
    input.userAnswer !== undefined &&
    input.userAnswer.trim().toLowerCase() !== input.correctAnswer.trim().toLowerCase();
  const userMessage = `PASSAGE:
${input.passage}

QUESTION TYPE: ${input.questionType}
QUESTION: ${input.questionPrompt}
${input.options && input.options.length ? `OPTIONS:\n${input.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}` : ""}
CORRECT ANSWER: ${input.correctAnswer}
${input.userAnswer ? `USER'S ANSWER: ${input.userAnswer}` : ""}
USER GOT IT ${isWrong ? "WRONG — explain in 'mistake' what made them choose that option" : "CORRECT — leave 'mistake' empty"}

Return JSON only.`;
  const text = await groqChat(
    [
      { role: "system", content: READING_EXPLAIN_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.2, maxTokens: 1100 },
  );
  const parsed = extractJSON(text) as Partial<ReadingExplainResult>;
  return {
    quote: parsed.quote ?? "",
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    translation: parsed.translation ?? "",
    reasoning: parsed.reasoning ?? "",
    mistake: parsed.mistake ?? "",
  };
}

export interface TipsInput {
  skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR";
  score?: number;
  context?: string;
}

export async function generateTipsGroq(input: TipsInput): Promise<{
  tips: { title: string; detail: string }[];
  encouragement: string;
}> {
  const userMessage = `Skill: ${input.skill}
${input.score !== undefined ? `Band achieved: ${input.score.toFixed(1)}` : ""}
${input.context ? `Context: ${input.context}` : ""}

Give 3-4 specific tips. Return JSON only.`;

  const text = await groqChat(
    [
      { role: "system", content: TIPS_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.5, maxTokens: 700 },
  );
  return extractJSON(text) as {
    tips: { title: string; detail: string }[];
    encouragement: string;
  };
}
