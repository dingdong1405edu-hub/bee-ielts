const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

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

Be honest, specific, constructive. Quote short excerpts when giving feedback.
Return ONLY valid JSON matching this exact shape:

{
  "overallBand": 6.5,
  "criteria": {
    "taskAchievement": { "band": 6, "feedback": "..." },
    "coherenceCohesion": { "band": 7, "feedback": "..." },
    "lexicalResource": { "band": 6, "feedback": "..." },
    "grammaticalRange": { "band": 6.5, "feedback": "..." }
  },
  "annotations": [{ "excerpt": "...", "issue": "...", "suggestion": "..." }],
  "improvedVersion": "...",
  "summary": "..."
}`;

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
