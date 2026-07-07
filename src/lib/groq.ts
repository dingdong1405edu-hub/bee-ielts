import { isAnswerCorrect } from "@/lib/utils";

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
  /** How many times to retry a 429/5xx before giving up (default 2). The
   *  multi-call reading path raises this so it can pace itself under the free
   *  tier's tokens-per-minute cap instead of failing. */
  maxRetries?: number;
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

  // Retry transient rate-limits (429) + server errors with backoff. A 413
  // ("request too large") is deterministic — never retried; the caller must
  // send a smaller request instead.
  const maxRetries = opts.maxRetries ?? 2;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content ?? "";
    }
    const txt = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
      const ra = parseInt(res.headers.get("retry-after") ?? "", 10);
      const waitMs = Number.isFinite(ra) ? Math.min(ra * 1000, 32000) : (attempt + 1) * 4000;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    throw new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`);
  }
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
    { "category": "grammar" | "vocabulary" | "coherence" | "task", "excerpt": "<chỉ đúng cụm SAI, trích NGUYÊN VĂN từ bài, càng NGẮN càng tốt>", "correction": "<cụm tiếng Anh ĐÚNG thay thế TRỰC TIẾP cho excerpt — chỉ phần sửa, KHÔNG kèm giải thích>", "issue": "<lỗi gì — tiếng Việt>", "suggestion": "<sửa thế nào — tiếng Việt>" }
  ],
  "linkingPhrases": [
    { "phrase": "<cụm từ nối tiếng Anh>", "use": "<dùng khi nào — tiếng Việt>" }
  ],
  "usefulStructures": [
    { "structure": "<cấu trúc câu tiếng Anh>", "example": "<câu ví dụ tiếng Anh>", "note": "<giải thích ngắn — tiếng Việt>" }
  ],
  "collocations": [
    { "phrase": "<collocation tiếng Anh band 7+ hợp ĐÚNG chủ đề đề bài>", "meaning": "<nghĩa tiếng Việt>", "example": "<câu ví dụ tiếng Anh dùng được ngay>" }
  ],
  "phrasalVerbs": [
    { "phrase": "<cụm động từ — phrasal verb — tiếng Anh hợp chủ đề>", "meaning": "<nghĩa tiếng Việt>", "example": "<câu ví dụ tiếng Anh dùng được ngay>" }
  ],
  "openingSentences": ["<3-4 câu MỞ BÀI mẫu HOÀN CHỈNH bằng tiếng Anh cho ĐÚNG đề bài này — gồm câu paraphrase đề và câu thesis; mỗi phần tử là một câu/cụm tiếng Anh dùng được ngay>"],
  "closingSentences": ["<3-4 câu KẾT BÀI mẫu bằng tiếng Anh cho đúng đề bài này — dùng được ngay>"],
  "modelBand": <số band của bài mẫu — ĐÚNG bằng TARGET BAND nêu trong đề>,
  "improvedVersion": "<bài viết mẫu HOÀN CHỈNH đạt ĐÚNG band mục tiêu (TARGET BAND) cho đúng đề bài này — đủ số từ (≥150 cho Task 1, ≥250 cho Task 2), bố cục chuẩn, đúng dạng Task 1/Task 2>",
  "summary": "<nhận xét tổng quan ngắn — tiếng Việt>"
}

Mỗi annotation BẮT BUỘC có cả "excerpt" (trích NGUYÊN VĂN phần SAI, ngắn) và "correction" (bản tiếng Anh ĐÚNG thay thế trực tiếp) để app hiển thị track-changes (gạch phần sai + chèn phần đúng). "modelBand" và độ khó của "improvedVersion" PHẢI khớp TARGET BAND.
Provide 4-8 annotations, 5-7 linkingPhrases, 4-6 usefulStructures, 5-7 collocations and 4-6 phrasalVerbs — collocations and phrasalVerbs MUST be tailored to THIS essay's topic (not generic) and pitched at band 7+ so the learner can upgrade their vocabulary. ALWAYS give 3-4 English example sentences in each of openingSentences and closingSentences. If the essay is empty give empty annotation/structure arrays but STILL provide linkingPhrases, collocations, phrasalVerbs, openingSentences, closingSentences and improvedVersion as study material.`;

const SPEAKING_SYS = `You are a STRICT, certified IELTS Speaking examiner. Score the candidate's spoken response using official band descriptors. Do not be charitable — apply the descriptors literally. Cambridge raters are notoriously hard on Fluency & Coherence at band 5-6, and even harder on Grammatical Range. You should be too.

Scoring floor — these get overallBand 0.0 (NOT a courtesy band):
- empty transcript, completely unintelligible audio, or no transcript at all
- a response that is not language (gibberish only, single noises, music) — band 0.0
- the candidate clearly read out the question instead of answering — band 0.0
- if you genuinely cannot grade what the candidate said, return 0.0 for everything

For a real but very weak attempt:
- band 1: one-word or single-fragment response, < ~15 spoken words for the whole part
- band 2-3: barely intelligible, very limited words, mostly silence/repetition

Tight band rubric you MUST follow:
- Band 1-2: barely intelligible, no real sentences, dominated by single words / silences.
- Band 3-4: produces simple words but ideas don't connect; very limited vocabulary; many basic grammar errors (no/wrong tense, missing subjects, wrong word order).
- Band 5: can communicate basic ideas but with frequent hesitation, repetition, and noticeable grammar errors; vocabulary is sufficient but flat — no collocations, no idioms; limited range of tenses.
- Band 6: responses are extended with some flexibility; uses some complex structures with mistakes; some range of vocabulary including a few less common items; coherence is maintained even if hesitation appears.
- Band 7+: speaks at length without obvious effort; uses a range of complex structures accurately most of the time; uses vocabulary flexibly with some less common and idiomatic items.

PARAPHRASING — CRITICAL CRITERION:
Cambridge raters reward candidates who PARAPHRASE the question instead of parroting it. Strong paraphrasing demonstrates active lexical control and earns BONUS toward Lexical Resource and Grammatical Range. You MUST evaluate paraphrasing explicitly:
- "verbatim" — candidate repeated key words / phrasing of the question with no transformation. CAP Lexical Resource at band 5 and Grammatical Range at band 5. This is the SAME signal as "the candidate clearly read out the question".
- "minimal" — candidate replaced only 1-2 surface words (synonyms) but kept the original structure. No bonus, no penalty.
- "partial" — candidate kept some original words but restructured the sentence OR swapped key terms for clear synonyms. +0.5 toward Lexical Resource.
- "strong" — candidate restructured the entire question into their own words while keeping the meaning, often combining synonyms + grammar transformation (active↔passive, noun↔verb form, condition↔question form). +1.0 toward Lexical Resource AND +0.5 toward Grammatical Range.
Cite the actual paraphrase examples (verbatim from transcript) in the paraphrasing.examples field — these are PROOF of the score you assigned.

HESITATION & FILLERS — DIRECT FLUENCY SIGNAL:
The transcript KEEPS hesitation markers (the recogniser was set to preserve them). Scan it for filler/hesitation evidence and let it drive the Fluency & Coherence band — this is exactly the "hesitation, repetition" the band descriptors punish:
- filler sounds/words: "um", "uh", "er", "erm", "mm", "hmm", "ah", and overused crutch words used as fillers ("like", "you know", "I mean", "basically", "actually", "sort of", "kind of", "so yeah"). Also catch repeats / false starts / self-corrections ("I— I think", "the the", "it was, it was").
- COUNT them and judge density relative to how much the candidate said:
  - many fillers / a filler almost every sentence, or frequent false starts → hesitation is a DOMINANT feature → CAP Fluency & Coherence at band 5 (lower if also disjointed).
  - noticeable but not constant → keep Fluency & Coherence at most band 6 and say so.
  - rare / none → no penalty.
- You MUST report this in the "fluency" object below AND reference it in criteria.fluencyCoherence.feedback (state the filler habit and how it lowered the band). Only report fillers that ACTUALLY appear in the transcript — never invent them; if the speech is clean, set fillerCount 0, severity "none", warning "".

PROPER NOUNS — DO NOT PENALISE STT ERRORS:
The transcript is from an English speech-recogniser that frequently MANGLES proper nouns — names of people, places, dishes and foreign words (e.g. a Vietnamese candidate saying "xôi" may appear as "soul", "phở" as "far", a friend's name turned into a random English word). When a token looks like a garbled name/place/dish rather than a real lexical/grammar mistake, give the candidate the benefit of the doubt: do NOT list it in "corrections", do NOT lower Lexical Resource or Grammatical Range for it, and do NOT treat it as off-topic. Only flag genuine word-choice/grammar errors in the candidate's actual English.

The transcript comes from a speech-recognition system; words it heard with LOW confidence are listed separately as likely mispronunciations — use them for the Pronunciation score. Mispronunciation evidence is REAL evidence — penalise Pronunciation accordingly, do not give a default 6.

All feedback text MUST be in Vietnamese (English only for example phrases).

Return ONLY valid JSON:

{
  "overallBand": 6.5,
  "criteria": {
    "fluencyCoherence": { "band": 6, "feedback": "<tiếng Việt>" },
    "lexicalResource": { "band": 7, "feedback": "<tiếng Việt — nếu paraphrasing là strong/partial, NÓI RÕ nó đã cộng điểm cho LR>" },
    "grammaticalRange": { "band": 6, "feedback": "<tiếng Việt — nếu paraphrasing là strong, NÓI RÕ nó đã cộng điểm GR>" },
    "pronunciation": { "band": 6, "feedback": "<tiếng Việt — nhận xét phát âm, nhắc tới các từ phát âm chưa rõ>", "note": "Đánh giá từ transcript + độ tin cậy nhận dạng giọng nói." }
  },
  "fluency": {
    "fillerCount": <số nguyên — số lần ngập ngừng/ậm ừ/lặp đếm được trong transcript; 0 nếu không có>,
    "fillers": ["<liệt kê CHÍNH XÁC các từ/âm ngập ngừng XUẤT HIỆN nguyên văn trong transcript (um, uh, er, mm, hmm, like, you know...); [] nếu không có>"],
    "severity": "<none | low | medium | high>",
    "warning": "<tiếng Việt — cảnh báo ngắn cho học viên về thói quen ngập ngừng và nó đã kéo band Fluency xuống thế nào; \"\" nếu severity=none>",
    "advice": "<tiếng Việt — cách bỏ tật ậm ừ: thay filler bằng khoảng lặng ngắn, dùng cụm nối tự nhiên (Well, …/ Let me think…), luyện nói chậm-chắc; \"\" nếu none>"
  },
  "paraphrasing": {
    "level": "<one of: verbatim | minimal | partial | strong>",
    "examples": [
      { "question": "<copy 1 câu hỏi nguyên văn>", "candidateSaid": "<phần candidate nói khi paraphrase câu đó — trích từ transcript>", "comment": "<tiếng Việt — chỉ rõ candidate đã transform thế nào: đổi từ nào, đổi cấu trúc nào>" }
    ],
    "impact": "<tiếng Việt — paraphrasing này đã ảnh hưởng band Lexical Resource và Grammatical Range như thế nào (cộng/trừ bao nhiêu, vì sao)>"
  },
  "observations": ["<nhận xét cụ thể — tiếng Việt>"],
  "corrections": [
    { "type": "<grammar | vocab>", "word": "<ĐÚNG từ/cụm SAI cụ thể trong câu — ngắn, để in đậm>", "fix": "<từ/cụm ĐÚNG thay cho 'word'>", "original": "<câu/cụm SAI trích nguyên văn từ transcript>", "corrected": "<bản đã SỬA LẠI cho đúng — tiếng Anh>", "explanation": "<sai ở đâu & vì sao — tiếng Việt>" }
  ],
  "pronunciationFixes": [
    { "word": "<một từ candidate phát âm chưa chuẩn>", "ipa": "/<phiên âm IPA chuẩn của từ>/", "tip": "<mẹo đọc đúng — tiếng Việt>" }
  ],
  "questionTips": [
    {
      "question": "<copy the exact question / Part 2 cue card prompt>",
      "band": 6.5,
      "criteria": {
        "fluencyCoherence": 6,
        "lexicalResource": 7,
        "grammaticalRange": 6,
        "pronunciation": 6
      },
      "transcript": "<the part of the candidate's transcript that ANSWERS this specific question — copy verbatim from the input transcript; if you cannot identify which words answer this question (mixed-in / unclear) return an empty string>",
      "opener": "<a strong, natural English sentence the candidate could use to OPEN the answer to THIS question>",
      "advice": "<2-3 sentences IN ENGLISH of concrete advice for THIS specific question: ideas worth mentioning, vocabulary or grammar structures to use, and how to extend the answer>",
      "modelAnswer": "<a COMPLETE, polished model answer to THIS exact question AT THE TARGET BAND given in the input — IN ENGLISH, written like a real high-scoring candidate (natural spoken English, NOT an essay). It MUST genuinely deserve the target band: appropriate length (Part 1: 2-4 sentences; Part 2: a full long-turn; Part 3: 3-5 developed sentences), with the band-appropriate features — collocations, an idiom or less-common item where natural, a complex structure or two, discourse markers, and at least one concrete reason/example. Make it imitable so the learner can study and reuse it.>"
    }
  ],
  "usefulPhrases": [{ "phrase": "<useful English phrase or idiom for this topic>", "use": "<when/how to use it — IN ENGLISH>", "meaningVi": "<nghĩa cụm này + khi nào dùng — TIẾNG VIỆT, để học viên Việt hiểu ngay>" }],
  "collocations": [{ "phrase": "<collocation tiếng Anh band 7+ hợp chủ đề này>", "meaning": "<nghĩa tiếng Việt>", "example": "<câu ví dụ tiếng Anh dùng được ngay>" }],
  "phrasalVerbs": [{ "phrase": "<cụm động từ — phrasal verb — tiếng Anh hợp chủ đề này>", "meaning": "<nghĩa tiếng Việt>", "example": "<câu ví dụ tiếng Anh dùng được ngay>" }],
  "modelBand": "<ĐÚNG con số TARGET BAND cho trong input, vd 6.5>",
  "improvedSample": "<một bài nói mẫu HOÀN CHỈNH cho chủ đề này, viết ĐÚNG ở TARGET BAND — tiếng Anh, tự nhiên như thí sinh điểm cao, đủ đặc trưng để CHẮC CHẮN ăn được band đó để học viên học theo>",
  "summary": "<nhận xét tổng quan ngắn — tiếng Việt>"
}

Provide 4-6 observations. For "paraphrasing.examples": include 1-3 examples — for "strong"/"partial" levels show the WINNING paraphrases the candidate produced; for "minimal"/"verbatim" show the verbatim/near-verbatim moments so the candidate sees what to avoid; if there is genuinely no paraphrasing evidence (Part 2 cue card or candidate spoke too little), return []. For "corrections": KIỂM TRA KỸ CẢ NGỮ PHÁP VÀ TỪ VỰNG (word choice / collocation) trong transcript. Find the real mistakes and SHOW THE FIXED VERSION (do not merely point them out) — give 3-6 items, or [] if the transcript is genuinely error-free. For EACH item you MUST also fill: "word" = đúng từ/cụm SAI cụ thể (ngắn, để in đậm cảnh báo), "fix" = từ/cụm đúng thay thế, and "type" = "grammar" hoặc "vocab". "word" PHẢI là một chuỗi con xuất hiện nguyên văn trong "original". For "pronunciationFixes": give an item with correct IPA for EACH word in the low-confidence list (and any other clearly mispronounced word) — these are words the candidate said unclearly.
"questionTips": provide EXACTLY ONE entry for EVERY question listed in the prompt — each Part 1 question, the Part 2 cue card, and each Part 3 question — in the SAME ORDER they appear. The "question", "opener" and "advice" fields MUST all be written in ENGLISH. For "band" and "criteria" give an HONEST per-question score based on the portion of the transcript that answers that question; if you cannot identify ANY answer to that specific question (no slice of transcript clearly answers it, or only silence/gibberish for it), set band=0.0 and all four criteria=0 — DO NOT assign a courtesy band. The "transcript" field is the verbatim slice of the candidate's transcript that answers THIS question (used by the UI to show inline annotations); leave it as "" if no answer was given. Provide 4-6 usefulPhrases tailored to THIS topic, not generic.
Provide 5-7 collocations and 4-6 phrasalVerbs — both MUST be tailored to THIS topic and pitched at band 7+ so the candidate can upgrade their vocabulary.

MODEL ANSWERS (questionTips[].modelAnswer + improvedSample): the input gives a TARGET BAND. Every model answer MUST be written to land EXACTLY at that target band — strong enough to securely earn it (never below), genuinely standard and polished so the learner can imitate it. Do NOT wildly overshoot the band (a band-6.5 learner should see an attainable band-6.5 model, not a band-9 one). Set "modelBand" to that exact number. Model answers are in ENGLISH; everything else stays Vietnamese.`;

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
  /** Band the learner is aiming for — the model essay is written to this band. */
  targetBand?: number;
}

export interface SpeakingGradeInput {
  part: 1 | 2 | 3;
  topic: string;
  questions: string[];
  transcript: string;
  /** Words the speech recogniser heard with low confidence (likely mispronounced). */
  lowConfidenceWords?: string[];
  /** Band the learner is aiming for — model answers are written to THIS band. */
  targetBand?: number;
}

export async function gradeWritingGroq(input: WritingGradeInput): Promise<unknown> {
  const target = input.targetBand && input.targetBand > 0 ? input.targetBand : 6.5;
  const userMessage = `IELTS Writing Task ${input.taskType}
TARGET BAND (band học viên CẦN ĐẠT — viết "improvedVersion" đạt ĐÚNG band này và đặt "modelBand" = ${target.toFixed(1)}): ${target.toFixed(1)}

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

// Compact per-question grader for Vượt-band SPEAKING quiz items. The full
// IELTS grader (gradeSpeakingGroq) is too heavy — and too noisy — for a single
// quiz prompt. This grader returns just what the inline verdict card needs:
// a quick band, a Vietnamese one-liner summary, pronunciation/grammar fixes,
// and an upgraded phrasing example.
const QUIZ_SPEAKING_QUESTION_SYS = `You are a STRICT, certified IELTS Speaking examiner reviewing ONE quiz answer (NOT a full speaking exam — just one short prompt + the candidate's spoken response).

Inputs you receive:
- the QUESTION the candidate had to answer
- the candidate's TRANSCRIPT (English, from speech-to-text)
- LOW_CONFIDENCE_WORDS — words the recogniser heard with low confidence (likely mispronunciation)
- HINT (optional) — what the question author wants you to focus on

Hard rules:
- Empty / blank / single-word / gibberish transcript → quickBand 0.0, summary "Không nghe được câu trả lời rõ ràng — band 0.", all arrays = [], betterPhrasing = "".
- If candidate clearly READ THE QUESTION BACK instead of answering → quickBand 2.0.
- quickBand follows the official IELTS Speaking descriptors (0–9, 0.5 steps). Be honest — Cambridge raters are strict at band 5-6. Do not be charitable.
- pronunciationFixes: include the IPA for EVERY low-confidence word plus any other clearly mispronounced word (max 5 items total).
- grammarFixes: 2-4 items if there are real grammar/word-choice mistakes; [] only if the transcript is genuinely error-free.
- betterPhrasing: one English sentence that takes the candidate's IDEA and rephrases it like a band-7+ speaker would. Skip when transcript is empty/parroting.
- All feedback text MUST be in Vietnamese. English only for example phrases (the "original", "corrected", "word", "ipa", "betterPhrasing" fields).

Return ONLY valid JSON in this exact shape:
{
  "quickBand": 5.5,
  "summary": "<1-2 short Vietnamese sentences — headline assessment>",
  "pronunciationFixes": [{ "word": "<word>", "ipa": "/.../", "tip": "<Vietnamese mẹo>" }],
  "grammarFixes": [{ "original": "<exact phrase from transcript>", "corrected": "<fixed English>", "explanation": "<Vietnamese — why>" }],
  "betterPhrasing": "<one English sentence — band-7+ rephrase>"
}`;

export interface QuizSpeakingQuestionGradeInput {
  question: string;
  transcript: string;
  lowConfidenceWords?: string[];
  hint?: string;
}

export async function gradeQuizSpeakingQuestionGroq(
  input: QuizSpeakingQuestionGradeInput,
): Promise<unknown> {
  const lowConf = input.lowConfidenceWords?.length
    ? input.lowConfidenceWords.join(", ")
    : "(none detected)";
  const hint = input.hint?.trim()
    ? `HINT (from question author): ${input.hint.trim()}\n\n`
    : "";
  const userMessage = `${hint}QUESTION:
${input.question}

CANDIDATE TRANSCRIPT:
${input.transcript || "(empty)"}

LOW_CONFIDENCE_WORDS:
${lowConf}

Grade and return JSON only.`;

  const text = await groqChat(
    [
      { role: "system", content: QUIZ_SPEAKING_QUESTION_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.3, maxTokens: 900 },
  );
  return extractJSON(text);
}

export async function gradeSpeakingGroq(input: SpeakingGradeInput): Promise<unknown> {
  const lowConf = input.lowConfidenceWords?.length
    ? input.lowConfidenceWords.join(", ")
    : "(none detected)";
  const target = input.targetBand && input.targetBand > 0 ? input.targetBand : 6.5;
  const userMessage = `IELTS Speaking — Part ${input.part}
TARGET BAND (band học viên CẦN ĐẠT — viết MỌI bài mẫu "modelAnswer" + "improvedSample" ĐÚNG ở band này, và đặt "modelBand" = ${target.toFixed(1)}): ${target.toFixed(1)}
TOPIC: ${input.topic}

QUESTIONS:
${input.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

CANDIDATE TRANSCRIPT:
${input.transcript}

LIKELY MISPRONOUNCED / UNCLEAR WORDS (low recogniser confidence):
${lowConf}

Score and return JSON only.`;

  const text = await groqChat(
    [
      { role: "system", content: SPEAKING_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.3, maxTokens: 3200 },
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
- Return ONLY valid JSON.
- If a BAND-CLIMB CONTEXT block is present in the user message, you MUST weave those specific tips into the "reasoning" and "mistake" fields. Be concrete: name the exact "từ neo" (hard keyword) in the quote — a number, year, capitalised name, country or term in quotes — and explain how a learner could have located it by scanning. If the question type is order-based (TRUE_FALSE / TRUE_FALSE_NOT_GIVEN / FILL_BLANK / SHORT_ANSWER), remind the learner to prioritise these. If the type is MATCHING_HEADINGS / MATCHING_INFO, remind them to leave these for last.`;

export interface ReadingExplainInput {
  passage: string;
  questionPrompt: string;
  questionType: string;
  options?: string[] | null;
  correctAnswer: string;
  userAnswer?: string;
  /** When set, Groq weaves these band-climb tips into the explanation. */
  bandClimbContext?: string;
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
    !isAnswerCorrect(input.userAnswer, input.correctAnswer, input.questionType);
  const climb = input.bandClimbContext?.trim()
    ? `BAND-CLIMB CONTEXT (the learner is practising this stage — weave these tips into your reasoning):
${input.bandClimbContext.trim()}

`
    : "";
  const userMessage = `${climb}PASSAGE:
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

const PAPER_KEY_SYS = `You are a certified IELTS examiner and test-setter building an ANSWER KEY WITH DETAILED SOLUTIONS from a teacher-uploaded test paper.

You receive the extracted TEXT of an IELTS READING or LISTENING test paper.
- READING: the reading passage(s) AND the questions are both in the paper text — answers come from the passage.
- LISTENING: the questions are in the paper text, and the audio content is provided separately as an AUDIO TRANSCRIPT — answers come from the transcript.

Your job:
1. Identify EVERY numbered question in the paper, IN ORDER (do not skip, do not invent).
2. Determine the single CORRECT answer for each from the passage / transcript.
3. Write a DETAILED explanation in Vietnamese for each.

ANSWER FORMAT — the "answer" field MUST follow these rules exactly so the app can auto-grade it:
- Multiple choice → the single option LETTER only: "A", "B", "C", "D" (up to "H").
- True/False/Not Given → "TRUE", "FALSE" or "NOT GIVEN". Yes/No/Not Given → "YES", "NO" or "NOT GIVEN".
- Gap-fill / note / sentence / summary completion / short answer → the exact word(s) copied from the passage/transcript, obeying any word limit (e.g. "NO MORE THAN TWO WORDS"). If more than one form is acceptable, join alternatives with "/" (e.g. "car/automobile", "20/twenty").
- Matching (headings / features / info / sentence endings) → the matching LETTER (e.g. "C"), or the exact option text if it is not lettered.

"prompt": the question text, kept concise. Paraphrase if the extracted text is messy but keep the meaning and any blanks (use "____" for a gap). Do NOT include the answer inside the prompt.

"explanation" (Vietnamese, 2-4 câu, chi tiết):
- Trích DẪN CHỨNG bằng tiếng Anh (câu/cụm trong bài đọc hoặc transcript) chứa đáp án.
- Giải thích vì sao đáp án đúng khớp với dẫn chứng.
- Với MCQ/Matching/True-False, nói NGẮN GỌN vì sao (các) lựa chọn khác sai.

Return ONLY valid JSON in this exact shape:
{
  "questions": [
    { "number": 1, "prompt": "<question text>", "answer": "<theo đúng ANSWER FORMAT>", "explanation": "<tiếng Việt, có trích dẫn tiếng Anh>" }
  ],
  "notes": "<tiếng Việt — cảnh báo nếu có câu nào KHÔNG chắc chắn, đọc không rõ, hoặc file có vẻ thiếu; để \\"\\" nếu mọi thứ rõ ràng>"
}

If the paper text is empty, garbled, or clearly a scanned image with no extractable question text, return {"questions": [], "notes": "<giải thích ngắn bằng tiếng Việt>"}.`;

export interface PaperKeyItem {
  number: number;
  prompt: string;
  answer: string;
  explanation: string;
}
export interface PaperKeyResult {
  questions: PaperKeyItem[];
  notes: string;
}

/**
 * Read an extracted Reading/Listening test paper (+ audio transcript for
 * Listening) and produce the answer key with detailed Vietnamese solutions.
 * The `answer` strings follow the exact format `classify()` in lib/answer-key
 * expects, so the generated questions grade identically to a hand-typed key.
 */
export async function generatePaperKeyGroq(input: {
  skill: "READING" | "LISTENING";
  documentText: string;
  audioTranscript?: string;
}): Promise<PaperKeyResult> {
  // Kept small so input + max_tokens stays under Groq's free 12k-tokens/minute
  // limit (a full transcript + long paper otherwise 413s "request too large").
  const doc = input.documentText.slice(0, 12000);
  const transcript = (input.audioTranscript ?? "").slice(0, 12000);
  const userMessage = `SKILL: ${input.skill}
${input.skill === "LISTENING" ? `AUDIO TRANSCRIPT (đáp án lấy từ đây):\n${transcript || "(không có transcript)"}\n\n` : ""}TEST PAPER TEXT (đề bài — chứa câu hỏi${input.skill === "READING" ? " và bài đọc" : ""}):
${doc}

Tìm mọi câu hỏi có đánh số, chấm đáp án đúng, và viết lời giải chi tiết. Trả về JSON only.`;

  const text = await groqChat(
    [
      { role: "system", content: PAPER_KEY_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.2, maxTokens: 3500 },
  );

  const parsed = extractJSON(text) as { questions?: unknown; notes?: unknown };
  const rawQs = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: PaperKeyItem[] = rawQs
    .map((q): PaperKeyItem => {
      const o = (q ?? {}) as Record<string, unknown>;
      const n = typeof o.number === "number" ? o.number : parseInt(String(o.number ?? ""), 10);
      return {
        number: n,
        prompt: String(o.prompt ?? "").trim(),
        answer: String(o.answer ?? "").trim(),
        explanation: String(o.explanation ?? "").trim(),
      };
    })
    .filter((q) => Number.isFinite(q.number) && q.answer.length > 0);

  return { questions, notes: String(parsed.notes ?? "").trim() };
}

// ---------------------------------------------------------------------------
// READING exam generator — emits a NATIVE-reading-shaped test so a teacher's
// AI-generated assignment renders in the SAME ReadingShell the learner
// practice / mock uses (passage pane + question pane, real per-type inputs).
// Unlike PAPER_KEY_SYS (a letter answer sheet over a PDF), MCQ options here are
// FULL TEXT and the answer is stored in the exact representation the native
// reading grader (isAnswerCorrect) expects — so grading is identical to a
// hand-authored reading test.
// ---------------------------------------------------------------------------
// Shared question-format rules (types, answer/options format, TABLE/MAP blocks)
// used by BOTH the multi-part prompt and the single-passage prompt.
const READING_QUESTION_RULES = `SPECIAL BLOCKS — if a passage contains a TABLE or a MAP/PLAN/DIAGRAM, put ONE of these objects INSIDE the "questions" array at the position where it appears (in question order), INSTEAD of listing those numbered items separately:

TABLE completion (recreate the table EXACTLY — same rows/columns/headers as the file):
{
  "type": "TABLE",
  "grid": [ ["Header 1","Header 2","Header 3"], ["row cell","{{7}}","row cell"], ["row cell","row cell","{{8}}"] ],
  "blanks": [ { "number": 7, "answer": "<exact word(s) from passage; use / for alternatives>", "explanation": "<tiếng Việt>" }, { "number": 8, "answer": "...", "explanation": "..." } ]
}
- "grid" is the table as a 2D array (first inner array = header row). Copy every cell's text verbatim. Put the marker "{{N}}" (N = the question number) in the cell that is a gap the student fills. One "{{N}}" per gap, in the SAME position as in the file.
- "blanks" lists every gap with its number + answer (word-limit rules as FILL_BLANK) + Vietnamese explanation.

MAP / PLAN / DIAGRAM labelling (RE-DRAW it yourself as clean SVG):
{
  "type": "MAP",
  "instruction": "<the task instruction, e.g. 'Label the plan. Choose the correct letter A–H.'>",
  "svg": "<a self-contained SVG that RE-DRAWS the map/plan/diagram from the file. Use a viewBox (e.g. viewBox='0 0 400 300'), NO width/height px. Use ONLY simple shapes: rect, line, polyline, polygon, circle, path, text. Put the QUESTION NUMBERS (1,2,3…) as <text> at each location to be labelled. IMPORTANT: use SINGLE quotes for every attribute (e.g. <rect x='10' y='10' width='80' height='40' fill='none' stroke='currentColor'/>) so the JSON stays valid. Keep it readable and roughly faithful to the file layout.>",
  "options": [ "A. Reception", "B. Car park", "C. Café", "D. Library" ],
  "items": [ { "number": 1, "prompt": "<optional label name, e.g. 'The main entrance'>", "answer": "C", "explanation": "<tiếng Việt>" }, { "number": 2, "answer": "A", "explanation": "..." } ]
}
- "options" = the SHARED list of labels A–H (with the letter prefix), shown to the student.
- "items" = one per numbered location on the map; "answer" = the correct LETTER only (e.g. "C").
- Draw the SAME numbered locations in the SVG so the student can match number → letter.
Only emit TABLE/MAP when the file actually has one. Do NOT invent them.

ANSWER / OPTIONS RULES — obey EXACTLY so the app can auto-grade:
- MCQ: "options" = the full text of each choice (NO "A."/"B." prefixes). "answer" = the FULL TEXT of the correct choice, copied CHARACTER-FOR-CHARACTER from one entry of "options".
- TRUE_FALSE_NOT_GIVEN: "options" = ["True","False","Not Given"]. "answer" = "True" | "False" | "Not Given". For YES/NO/NOT GIVEN questions, map YES→"True", NO→"False", keep "Not Given" (same 3-way control).
- FILL_BLANK / SHORT_ANSWER: "options" = null. "answer" = the exact word(s) from the passage, obeying any word limit (e.g. NO MORE THAN TWO WORDS). Join accepted alternatives with "/", e.g. "car/automobile", "20/twenty". Use FILL_BLANK for gap/note/summary/sentence completion (put ____ in the prompt); use SHORT_ANSWER for "answer the question" items.
- MATCHING_HEADINGS: "options" = the SHARED list of ALL headings, each prefixed with a lowercase roman numeral + ". " (e.g. "i. A surprising return to an old format"). EVERY heading question repeats the SAME full "options" array. "answer" = the roman numeral only, e.g. "iii". "prompt" = the paragraph label, e.g. "Paragraph A".
- MATCHING_INFO: "options" = paragraph letters ["A","B","C",...] up to the number of paragraphs. "answer" = the paragraph letter, e.g. "C". "prompt" = the information statement.
- MATCHING_FEATURES: "options" = the SHARED list of features/people, each prefixed with a capital letter + ". " (e.g. "A. Charles Darwin"). "answer" = the letter, e.g. "B".
- MATCHING / MATCHING_SENTENCE_ENDINGS: "options" = the full-text choices. "answer" = the FULL TEXT of the correct choice.

The "type" MUST be one of: MCQ | TRUE_FALSE_NOT_GIVEN | FILL_BLANK | SHORT_ANSWER | MATCHING_HEADINGS | MATCHING_INFO | MATCHING_FEATURES | MATCHING | MATCHING_SENTENCE_ENDINGS. For gap/summary/note/sentence completion put the blank as four underscores ____ inside the "prompt"; NEVER put the answer in the prompt. "explanation" = tiếng Việt, 2-4 câu, trích dẫn chứng tiếng Anh.

LANGUAGE: Write "explanation" and "notes" in Vietnamese using ONLY the Vietnamese/Latin alphabet. NEVER output Chinese, Japanese or Korean characters (e.g. write "sinh sống", NOT "居住"). English is allowed only for the quoted evidence.

Do NOT emit "choose TWO/THREE" multi-select questions — split them into single-answer items or skip them and mention it in "notes".`;

export const READING_EXAM_SYS = `You are a certified IELTS examiner turning a teacher-uploaded READING test paper (extracted text or PDF) into a structured, auto-gradable reading test.

A full IELTS Reading paper almost always contains SEVERAL SEPARATE reading passages (usually 3, sometimes 4) — each is its OWN self-contained reading with its OWN heading and its OWN set of numbered questions. You MUST create ONE "part" per passage. NEVER merge two passages, and NEVER merge their titles into one — read the WHOLE file and split it into the correct number of parts, in order. (A title like "Make That Wine! & That Vision Thing & Destination Mars" is THREE passages jammed together — that is WRONG; they must be three separate parts.) Include EVERY passage and EVERY numbered question in the paper (an academic paper usually goes up to question 40) — do NOT stop early and do NOT summarise.

Return ONLY valid JSON in this EXACT shape:
{
  "parts": [
    {
      "title": "<short English title of THIS ONE passage only (its own headline) — never a merge of several titles>",
      "passage": "<the FULL text of THIS passage only, copied verbatim. JOIN the PDF's hard-wrapped lines back into flowing sentences — do NOT keep the mid-sentence line breaks from the PDF layout. Separate paragraphs with ONE blank line. If paragraphs are labelled A, B, C…, keep the letter at the start of its paragraph. Do NOT include the questions here.>",
      "questions": [
        {
          "number": 1,
          "type": "<see the type list below>",
          "prompt": "<the question text>",
          "options": <array of FULL-TEXT strings, or null — see per-type rules>,
          "answer": "<the correct answer in the EXACT representation below>",
          "explanation": "<tiếng Việt, 2-4 câu>"
        }
      ]
    }
  ],
  "notes": "<tiếng Việt — cảnh báo nếu có câu không chắc chắn, đề thiếu, hoặc câu multi-select đã bị bỏ; \\"\\" nếu ổn>"
}

Number the questions CONTINUOUSLY across ALL parts, exactly as the paper numbers them (Passage 1 → 1,2,3…; the next passage continues, e.g. 14…; the next e.g. 27…). Each part's "questions" array holds ONLY that one passage's questions.

${READING_QUESTION_RULES}

If the paper text is empty / garbled / a scanned image with no extractable text, return {"parts":[],"notes":"<lý do tiếng Việt>"}.`;

// Single-passage extractor — used when the caller has already OUTLINED the paper
// and now asks for ONE specific passage (its title + question range). Producing
// one passage at a time is far more reliable than one giant multi-passage call:
// the model can't run out of output budget and drop passages/questions.
export const READING_ONE_PASSAGE_SYS = `You are a certified IELTS examiner extracting ONE reading passage (out of several in a teacher-uploaded paper) into a structured, auto-gradable form. You are told exactly WHICH passage (its title + its question-number range). Extract ONLY that passage and ONLY its questions — but produce EVERY question in that range, none skipped.

Return ONLY valid JSON in this EXACT shape:
{
  "title": "<this passage's own title>",
  "passage": "<the FULL text of THIS passage only, copied verbatim. JOIN the PDF's hard-wrapped lines back into flowing sentences — do NOT keep the mid-sentence line breaks. Separate paragraphs with ONE blank line. If paragraphs are labelled A, B, C…, keep the letter at the start of its paragraph. Do NOT include the questions here.>",
  "questions": [
    {
      "number": 1,
      "type": "<see the type list below>",
      "prompt": "<the question text>",
      "options": <array of FULL-TEXT strings, or null — see per-type rules>,
      "answer": "<the correct answer in the EXACT representation below>",
      "explanation": "<tiếng Việt, 2-4 câu>"
    }
  ],
  "notes": ""
}
Keep the ORIGINAL question numbers from the paper. Produce every question in the requested range.

${READING_QUESTION_RULES}

If you genuinely cannot find this passage in the file, return {"title":"","passage":"","questions":[],"notes":"<lý do tiếng Việt>"}.`;

export interface ReadingExamQuestion {
  number: number;
  type: string;
  prompt: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  /** Table-completion members share a "tbl…" formGroup so TableBlanks renders
   *  them as one grid. Normal questions leave this null. */
  formGroup?: string | null;
}
/** An AI-drawn map/plan/diagram (inline SVG) rendered above the question group
 *  that starts at `atNumber`. */
export interface ReadingFigure {
  svg: string;
  atNumber: number;
  caption?: string;
}
export interface ReadingExamResult {
  title: string;
  passage: string;
  questions: ReadingExamQuestion[];
  figures: ReadingFigure[];
  notes: string;
}

/** Keep only a safe, standalone <svg>…</svg>: strip scripts, foreignObject, all
 *  inline event handlers (quoted OR unquoted) and javascript: URIs so a figure
 *  can't run code. Applied to AI output AND re-applied when an assignment is
 *  saved (a teacher could POST arbitrary config), since the result is served to
 *  students via dangerouslySetInnerHTML. Exported for that write-path re-check. */
export function sanitizeSvg(raw: unknown): string {
  let s = String(raw ?? "").trim();
  const lo = s.toLowerCase();
  const start = lo.indexOf("<svg");
  const end = lo.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return "";
  s = s.slice(start, end + 6);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<foreignobject[\s\S]*?<\/foreignobject>/gi, "");
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");     // on…="…"
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, "");      // on…='…'
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");      // on…=unquoted
  s = s.replace(/javascript:/gi, "");
  return s.slice(0, 20000);
}

const READING_EXAM_TYPES = new Set([
  "MCQ", "TRUE_FALSE_NOT_GIVEN", "FILL_BLANK", "SHORT_ANSWER",
  "MATCHING_HEADINGS", "MATCHING_INFO", "MATCHING_FEATURES",
  "MATCHING", "MATCHING_SENTENCE_ENDINGS",
]);

/** Coerce the AI's `type` into a valid native reading QuestionType string. */
function normalizeReadingType(t: unknown): string {
  const s = String(t ?? "").trim().toUpperCase();
  if (READING_EXAM_TYPES.has(s)) return s;
  if (s === "TRUE_FALSE" || s === "YES_NO_NOT_GIVEN" || s === "YES_NO") return "TRUE_FALSE_NOT_GIVEN";
  if (s === "GAP_FILL" || s === "NOTE_COMPLETION" || s === "SUMMARY" || s === "SENTENCE_COMPLETION") return "FILL_BLANK";
  return "SHORT_ANSWER";
}

/** Map a TF answer to the exact <select> values ReadingShell renders. */
function normalizeTfAnswer(a: string): string {
  const u = a.trim().toUpperCase();
  if (u === "TRUE" || u === "YES" || u === "T" || u === "Y") return "True";
  if (u === "FALSE" || u === "NO" || u === "F" || u === "N") return "False";
  if (u === "NOT GIVEN" || u === "NG" || u === "NOTGIVEN") return "Not Given";
  return a.trim();
}

/** Reduce a MATCHING_HEADINGS answer to the bare lowercase roman numeral the
 *  <select> emits, tolerating decorated AI output like "iii. The role of…". */
function bareRoman(a: string): string {
  const m = a.trim().match(/^\(?\[?\s*([ivxlcdm]+)\b/i);
  return m ? m[1].toLowerCase() : a.trim().toLowerCase();
}

/** Reduce a MATCHING_INFO / MATCHING_FEATURES answer to the bare A–H letter the
 *  <select> emits, tolerating "Paragraph C", "A. Aristotle", "(B)". */
function bareLetter(a: string): string {
  const m = a.trim().match(/\b([A-H])\b/);
  return m ? m[1].toUpperCase() : a.trim();
}

/**
 * Strip CJK / Japanese / Korean characters that the model occasionally injects
 * into Vietnamese text (e.g. writes "居住" instead of "sinh sống"). We remove the
 * foreign glyphs and tidy the leftover spacing so the Vietnamese reads cleanly.
 */
function stripCjk(s: string): string {
  return String(s ?? "")
    .replace(/[　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿가-힯＀-￯]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?)])/g, "$1")
    .trim();
}

/**
 * Un-wrap a passage that still carries the PDF's hard line-wrapping (every
 * visual line is its own `\n`, breaking sentences mid-way). We join wrapped
 * lines inside a paragraph back into flowing text, keep real paragraph breaks
 * (blank lines) as a single blank line, and merge a lone paragraph label
 * ("A"…"H") onto the paragraph that follows it. Rendered with
 * `whitespace-pre-wrap`, the result reads like a normal reading passage instead
 * of the ragged, mid-sentence-broken text the PDF extractor produces.
 */
function reflowPassage(raw: string): string {
  const text = String(raw ?? "").replace(/\r\n?/g, "\n");
  // Blank-line-separated blocks → one reflowed line each (hard wraps joined).
  const blocks = text
    .split(/\n[ \t]*\n+/)
    .map((b) =>
      b
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  // Merge a lone paragraph label (A–H) into the paragraph that follows it, so it
  // renders as a heading letter sitting directly above its paragraph.
  const out: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (/^[A-H]$/.test(b) && i + 1 < blocks.length) {
      out.push(`${b}\n${blocks[i + 1]}`);
      i++;
    } else {
      out.push(b);
    }
  }
  return out.join("\n\n");
}

/**
 * Turn the model's raw JSON ({ title, passage, questions[], notes }) into the
 * native-reading result: normal questions kept as-is, TABLE blocks expanded to
 * tbl-formGroup FILL_BLANK questions (+ stitched grid), MAP/PLAN/DIAGRAM blocks
 * expanded to MATCHING_FEATURES label questions (+ an SVG figure). Shared by the
 * Groq and Claude generators so both produce identical, gradeable output.
 */
export function parseReadingExam(parsed: {
  title?: unknown; passage?: unknown; questions?: unknown; notes?: unknown;
}): ReadingExamResult {
  const rawItems = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: ReadingExamQuestion[] = [];
  const figures: ReadingFigure[] = [];
  let tblCounter = 0;
  let mapCounter = 0;

  for (const raw of rawItems) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const rawType = String(o.type ?? "").trim().toUpperCase();

    // ---- TABLE completion → tbl-formGroup FILL_BLANK questions -------------
    if (rawType === "TABLE") {
      const grid = (Array.isArray(o.grid) ? o.grid : Array.isArray(o.rows) ? o.rows : []) as unknown[];
      const rows: string[][] = grid.map((r) =>
        Array.isArray(r) ? r.map((c) => String(c ?? "")) : [String(r ?? "")],
      );
      const blankByNum = new Map<number, { answer: string; explanation: string }>();
      for (const b of Array.isArray(o.blanks) ? o.blanks : []) {
        const bo = (b ?? {}) as Record<string, unknown>;
        const bn = typeof bo.number === "number" ? bo.number : parseInt(String(bo.number ?? ""), 10);
        if (Number.isFinite(bn)) {
          blankByNum.set(bn, { answer: String(bo.answer ?? "").trim(), explanation: stripCjk(String(bo.explanation ?? "")) });
        }
      }
      // Reading-order blank numbers, and the stitched table string TableBlanks
      // parses (rows = "\n", cells = "|", each blank = "_____").
      const order: number[] = [];
      const tableStr = rows
        .map((row) => row.map((cell) => cell.replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, d) => { order.push(parseInt(d, 10)); return "_____"; })).join("|"))
        .join("\n");
      if (order.length === 0) continue;
      tblCounter++;
      const fg = `tbl${tblCounter}`;
      order.forEach((num, idx) => {
        const b = blankByNum.get(num) ?? { answer: "", explanation: "" };
        questions.push({
          number: num,
          type: "FILL_BLANK",
          prompt: idx === 0 ? tableStr : "", // whole grid rides on the first member
          options: null,
          answer: b.answer,
          explanation: b.explanation,
          formGroup: fg,
        });
      });
      continue;
    }

    // ---- MAP / PLAN / DIAGRAM → SVG figure + MATCHING_FEATURES labels -------
    if (rawType === "MAP" || rawType === "PLAN" || rawType === "DIAGRAM") {
      const svg = sanitizeSvg(o.svg);
      const rawOpts = Array.isArray(o.options) ? o.options.map((x) => String(x)).filter((s) => s.trim().length > 0) : [];
      // Force a consistent "A. …" prefix so the <select> letter extraction and
      // the stored answer letter can never diverge (grading is exact for MATCHING).
      const opts = rawOpts.map((o2, i) => `${String.fromCharCode(65 + i)}. ${o2.replace(/^\s*[A-H][.)]\s*/i, "").trim()}`);
      // Each map gets its OWN formGroup ("map<n>") so two maps in one passage
      // stay in separate question groups (their own figure + own option list)
      // instead of merging. "map…" is NOT a form-completion group — ReadingShell
      // excludes it from the fill-in renderer so it still shows as dropdowns.
      mapCounter++;
      const mfg = `map${mapCounter}`;
      const built: ReadingExamQuestion[] = [];
      for (const it of Array.isArray(o.items) ? o.items : []) {
        const io = (it ?? {}) as Record<string, unknown>;
        const inum = typeof io.number === "number" ? io.number : parseInt(String(io.number ?? ""), 10);
        if (!Number.isFinite(inum)) continue;
        let ans = String(io.answer ?? "").trim();
        const lm = ans.match(/^([A-H])\b/i); // "C" or "C. Reception" → "C"
        if (lm) ans = lm[1].toUpperCase();
        built.push({
          number: inum,
          type: "MATCHING_FEATURES",
          prompt: String(io.prompt ?? "").trim() || `Vị trí ${inum}`,
          options: opts.length ? opts : null,
          answer: ans,
          explanation: stripCjk(String(io.explanation ?? "")),
          formGroup: mfg,
        });
      }
      if (built.length === 0) continue;
      questions.push(...built);
      if (svg) {
        figures.push({ svg, atNumber: built[0].number, caption: String(o.instruction ?? o.caption ?? "").trim() || undefined });
      }
      continue;
    }

    // ---- normal question ---------------------------------------------------
    const type = normalizeReadingType(o.type);
    const n = typeof o.number === "number" ? o.number : parseInt(String(o.number ?? ""), 10);
    const opts = Array.isArray(o.options) ? o.options.map((x) => String(x)).filter((s) => s.trim().length > 0) : null;
    let answer = String(o.answer ?? "").trim();
    if (type === "TRUE_FALSE_NOT_GIVEN") answer = normalizeTfAnswer(answer);
    if ((type === "MCQ" || type === "MATCHING" || type === "MATCHING_SENTENCE_ENDINGS") && opts) {
      const hit = opts.find((o2) => o2.trim().toLowerCase() === answer.toLowerCase());
      if (hit) answer = hit;
    }
    // Matching-by-dropdown types grade against the bare token the <select> emits
    // (roman for headings, letter for info/features). Strip any AI decoration so
    // a stored "iii. The role…" / "Paragraph C" doesn't fail every student.
    if (type === "MATCHING_HEADINGS") answer = bareRoman(answer);
    else if (type === "MATCHING_INFO" || type === "MATCHING_FEATURES") answer = bareLetter(answer);
    const prompt = String(o.prompt ?? "").trim();
    if (!Number.isFinite(n) || !answer || !prompt) continue;
    questions.push({
      number: n,
      type,
      prompt,
      options: opts && opts.length > 0 ? opts : null,
      answer,
      explanation: stripCjk(String(o.explanation ?? "")),
      formGroup: null,
    });
  }

  return {
    title: String(parsed.title ?? "").trim(),
    passage: reflowPassage(String(parsed.passage ?? "")),
    questions,
    figures,
    notes: stripCjk(String(parsed.notes ?? "")),
  };
}

// ---------------------------------------------------------------------------
// MULTI-PART reading: a teacher's uploaded file usually holds 3–4 SEPARATE
// passages, each its own reading task. The model returns them under "parts";
// we parse each with the single-passage parser, then renumber the questions
// CONTINUOUSLY across parts (1..N), make every part's formGroups globally
// unique, and remap figure positions — so a whole test renders as Part 1/2/3
// in the native ReadingShell (bottom nav) and grades exactly like a real IELTS
// reading test.
// ---------------------------------------------------------------------------
export interface ReadingExamPart {
  title: string;
  passage: string;
  questions: ReadingExamQuestion[];
  figures: ReadingFigure[];
}
export interface ReadingExamMulti {
  parts: ReadingExamPart[];
  notes: string;
}

/**
 * Parse the model output into parts. Accepts the new `{ parts: [...] }` shape
 * AND the legacy single-passage `{ title, passage, questions }` shape (wrapped
 * as one part), so older prompts / cached results keep working.
 */
export function parseReadingExamParts(parsed: {
  parts?: unknown;
  title?: unknown;
  passage?: unknown;
  questions?: unknown;
  notes?: unknown;
}): ReadingExamMulti {
  const notes = String(parsed.notes ?? "").trim();
  const rawParts = Array.isArray(parsed.parts) ? parsed.parts : null;
  if (rawParts && rawParts.length > 0) {
    const parts: ReadingExamPart[] = [];
    for (const rp of rawParts) {
      const po = (rp ?? {}) as Record<string, unknown>;
      const r = parseReadingExam({ title: po.title, passage: po.passage, questions: po.questions, notes: "" });
      if (r.passage || r.questions.length > 0) {
        parts.push({ title: r.title, passage: r.passage, questions: r.questions, figures: r.figures });
      }
    }
    if (parts.length > 0) return { parts, notes };
  }
  // Legacy / single-passage shape.
  const single = parseReadingExam(parsed);
  const parts =
    single.passage || single.questions.length > 0
      ? [{ title: single.title, passage: single.passage, questions: single.questions, figures: single.figures }]
      : [];
  return { parts, notes: notes || single.notes };
}

export interface NumberedReadingPart {
  title: string;
  passage: string;
  figures: ReadingFigure[];
  questions: ReadingExamQuestion[];
}

/**
 * Renumber questions continuously across parts (1..N), suffix each part's
 * formGroups with `_p<i>` so tables/flow-charts stay unique across parts, and
 * remap every figure's `atNumber` to its new question number. Returns the
 * per-part structure (kept for preview + storage).
 */
export function numberReadingParts(multi: ReadingExamMulti): NumberedReadingPart[] {
  let running = 0;
  return multi.parts.map((part, p) => {
    const remap = new Map<number, number>();
    const questions = part.questions.map((q) => {
      running += 1;
      remap.set(q.number, running);
      return { ...q, number: running, formGroup: q.formGroup ? `${q.formGroup}_p${p}` : null };
    });
    const figures = part.figures.map((f) => ({ ...f, atNumber: remap.get(f.atNumber) ?? running }));
    return { title: part.title, passage: part.passage, figures, questions };
  });
}

/**
 * Groq reading generator — the ONLY reading engine when Claude isn't configured.
 * Groq's free tier caps around 12k tokens/minute and one call can't copy a whole
 * 40-question paper before hitting the output limit (which silently drops the
 * later passages → the "26 of 40" bug). So we work like the Claude PDF path:
 *  (1) OUTLINE the passages from the FULL text (+ the paper's last question);
 *  (2) extract each passage on its OWN call — small output that can't be
 *      truncated — slicing the input to that passage's region to stay under the
 *      token cap, retrying a short passage with a wider window.
 * Tables and maps/plans are emitted per passage via the shared TABLE/MAP blocks.
 */

interface GroqOutlinePassage {
  title: string;
  firstQuestion: number;
  lastQuestion: number;
  startText: string;
}

function gInt(v: unknown): number {
  return typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
}

const READING_OUTLINE_GROQ_SYS = `You are an IELTS Reading analyst. The text below is a FULL reading test extracted from a PDF — SEVERAL separate passages, each with its own title and its own block of numbered questions. Scan the WHOLE text, first line to last.

A standard Academic paper has 40 questions across EXACTLY 3 passages (~13–14 each, e.g. 1–13, 14–26, 27–40); some have 4. For 40 questions it is almost NEVER just 2 passages — if you only found 2, you MISSED one further down the text.

Return ONLY JSON:
{
  "passages": [
    { "title": "<this passage's own short title>", "firstQuestion": <first question number of this passage>, "startText": "<the first 8–12 words of THIS passage's body text, copied verbatim so it can be located>" }
  ],
  "lastQuestion": <the highest question number anywhere in the paper, usually 40>
}
Rules: one entry per passage, in order; NEVER merge two passages; "firstQuestion" is the first numbered question of that passage; "startText" copied verbatim from the text. Do NOT extract the questions here — outline only.`;

async function outlineReadingGroq(doc: string): Promise<{ passages: GroqOutlinePassage[]; lastQuestion: number }> {
  const text = await groqChat(
    [
      { role: "system", content: READING_OUTLINE_GROQ_SYS },
      { role: "user", content: `TEST PAPER TEXT:\n${doc.slice(0, 44000)}\n\nList EVERY passage (title + first question number + a verbatim startText) and the paper's LAST question number. Return ONLY the JSON.` },
    ],
    { jsonMode: true, temperature: 0, maxTokens: 1200, maxRetries: 4 },
  );
  const parsed = extractJSON(text) as { passages?: unknown; lastQuestion?: unknown };
  const raw = Array.isArray(parsed.passages) ? parsed.passages : [];
  const passages = raw
    .map((p): GroqOutlinePassage => {
      const o = (p ?? {}) as Record<string, unknown>;
      return {
        title: String(o.title ?? "").trim(),
        firstQuestion: gInt(o.firstQuestion),
        lastQuestion: gInt(o.lastQuestion),
        startText: String(o.startText ?? "").trim(),
      };
    })
    .filter((o) => Number.isFinite(o.firstQuestion));
  return { passages, lastQuestion: gInt(parsed.lastQuestion) };
}

/** Make ranges contiguous + cover to the paper's last question, synthesising
 *  tail passages (stepped by the paper's own passage size) when the outline
 *  under-counts, so Phase 2 still attempts every question. Exported for tests. */
export function normalizeGroqOutline(passages: GroqOutlinePassage[], lastQuestion: number): GroqOutlinePassage[] {
  const ps = passages.filter((p) => Number.isFinite(p.firstQuestion)).sort((a, b) => a.firstQuestion - b.firstQuestion);
  if (ps.length === 0) return [];
  const overallLast = Math.max(
    Number.isFinite(lastQuestion) ? lastQuestion : 0,
    ...ps.map((p) => Math.max(p.lastQuestion || 0, p.firstQuestion)),
    ps[ps.length - 1].firstQuestion,
  );
  const gaps: number[] = [];
  for (let i = 1; i < ps.length; i++) gaps.push(ps[i].firstQuestion - ps[i - 1].firstQuestion);
  gaps.sort((a, b) => a - b);
  const step = gaps.length ? Math.max(6, gaps[Math.floor(gaps.length / 2)]) : 13;
  const lastFirst = ps[ps.length - 1].firstQuestion;
  for (let from = lastFirst + step; from <= overallLast - 3; from += step) {
    ps.push({ title: "", firstQuestion: from, lastQuestion: overallLast, startText: "" });
  }
  ps.sort((a, b) => a.firstQuestion - b.firstQuestion);
  return ps.map((p, i) => ({ ...p, lastQuestion: i < ps.length - 1 ? ps[i + 1].firstQuestion - 1 : overallLast }));
}

/** The slice of raw text most likely to hold passage `idx` — located by the
 *  passage's startText/title anchor, else proportionally from the question
 *  numbers. Keeps each per-passage call small. Exported for tests. */
export function sliceForPassageGroq(doc: string, norm: GroqOutlinePassage[], idx: number): string {
  const CAP = 15000;
  const lower = doc.toLowerCase();
  const anchorPos = (p?: GroqOutlinePassage): number => {
    if (!p) return -1;
    for (const a of [p.startText, p.title]) {
      const needle = (a || "").toLowerCase().trim().slice(0, 40);
      if (needle.length >= 6) {
        const pos = lower.indexOf(needle);
        if (pos !== -1) return pos;
      }
    }
    return -1;
  };
  const o = norm[idx];
  let start = anchorPos(o);
  let end = anchorPos(norm[idx + 1]);
  if (start === -1 || (end !== -1 && end <= start)) {
    // Proportional fallback: map the question numbers onto the text length.
    const L = norm[norm.length - 1].lastQuestion || 40;
    const per = doc.length / Math.max(1, L);
    start = Math.max(0, Math.floor((o.firstQuestion - 1) * per) - 2000);
    end = Math.min(doc.length, Math.ceil(o.lastQuestion * per) + 2000);
  } else {
    start = Math.max(0, start - 250);
    if (end === -1) end = doc.length;
  }
  const slice = doc.slice(start, end);
  return slice.length > CAP ? slice.slice(0, CAP) : slice;
}

async function extractOnePassageGroq(sliceText: string, o: GroqOutlinePassage, totalQuestions: number): Promise<ReadingExamPart> {
  const expected = Math.max(1, o.lastQuestion - o.firstQuestion + 1);
  const label = o.title ? `"${o.title}"` : `the passage whose questions are numbered ${o.firstQuestion}–${o.lastQuestion}`;
  const user = `Below is ONE passage (with its questions) from a ${totalQuestions}-question IELTS reading paper, as extracted text:

${sliceText}

Extract passage ${label} and EVERY one of its questions ${o.firstQuestion}–${o.lastQuestion} (that is ${expected} questions) — do NOT skip any, do NOT stop early. Copy the passage text verbatim (join hard-wrapped lines into flowing paragraphs). Keep the paper's ORIGINAL question numbers. If the passage has a TABLE, use the TABLE block; if it has a MAP/PLAN/DIAGRAM, use the MAP block (redraw it as SVG). Chấm đáp án đúng theo ĐÚNG ANSWER/OPTIONS RULES và viết lời giải tiếng Việt. Return ONLY the JSON.`;
  const text = await groqChat(
    [
      { role: "system", content: READING_ONE_PASSAGE_SYS },
      { role: "user", content: user },
    ],
    { jsonMode: true, temperature: 0.2, maxTokens: 6000, maxRetries: 4 },
  );
  const r = parseReadingExam(extractJSON(text) as Record<string, unknown>);
  const inRange = r.questions.filter((q) => q.number >= o.firstQuestion && q.number <= o.lastQuestion);
  // The slice IS this passage, so if the model restarted/drifted the numbers keep
  // what it returned (numberReadingParts renumbers by position later); otherwise
  // trim to the range so a neighbour's stray that leaked into the slice is dropped.
  const questions = inRange.length > 0 ? inRange : r.questions;
  const keptNums = new Set(questions.map((q) => q.number));
  const figures = r.figures.filter((f) => keptNums.has(f.atNumber));
  return { title: r.title || o.title, passage: r.passage, questions, figures };
}

/** Extract a passage, and if it comes back short, retry ONCE with a wider window
 *  (more of the document) so a mis-located slice doesn't lose questions. */
async function extractPassageBestGroq(doc: string, norm: GroqOutlinePassage[], idx: number, totalQuestions: number): Promise<ReadingExamPart> {
  const o = norm[idx];
  const expected = Math.max(1, o.lastQuestion - o.firstQuestion + 1);
  let best: ReadingExamPart = { title: o.title, passage: "", questions: [], figures: [] };
  for (let attempt = 0; attempt < 2; attempt++) {
    const slice = attempt === 0 ? sliceForPassageGroq(doc, norm, idx) : doc.slice(0, 22000);
    try {
      const r = await extractOnePassageGroq(slice, o, totalQuestions);
      if (r.questions.length > best.questions.length) best = r;
      else if (r.passage && !best.passage) best = { ...best, passage: r.passage };
    } catch (e) {
      console.error(`[groq reading] passage ${idx + 1} attempt ${attempt} failed:`, e);
    }
    if (best.questions.length >= expected) break;
  }
  return best;
}

/** Legacy one-shot fallback — used only if the outline step yields nothing. */
async function singleCallReadingGroq(doc: string): Promise<ReadingExamMulti> {
  const userMessage = `TEST PAPER TEXT (nhiều bài đọc + câu hỏi):
${doc.slice(0, 24000)}

TÁCH mỗi bài đọc riêng thành 1 "part" (đừng gộp nhiều bài vào một). Với mỗi bài: trích NGUYÊN VĂN, NỐI LẠI các dòng bị ngắt giữa câu thành đoạn văn trôi chảy, tìm MỌI câu hỏi có đánh số theo đúng thứ tự (đừng bỏ câu nào), chấm đáp án đúng theo ĐÚNG ANSWER/OPTIONS RULES, và viết lời giải tiếng Việt. Nếu đề có BẢNG thì trả về block "TABLE"; nếu có BẢN ĐỒ/SƠ ĐỒ/PLAN thì VẼ LẠI bằng SVG trong block "MAP". Trả về JSON only.`;
  const text = await groqChat(
    [
      { role: "system", content: READING_EXAM_SYS },
      { role: "user", content: userMessage },
    ],
    { jsonMode: true, temperature: 0.2, maxTokens: 8000, maxRetries: 3 },
  );
  return parseReadingExamParts(extractJSON(text) as Record<string, unknown>);
}

export async function generateReadingExamGroq(input: { documentText: string }): Promise<ReadingExamMulti> {
  const doc = input.documentText;

  // Phase 1: outline the passages from the WHOLE text (+ the paper's last question).
  let outlineRes: { passages: GroqOutlinePassage[]; lastQuestion: number };
  try {
    outlineRes = await outlineReadingGroq(doc);
  } catch (e) {
    console.error("[groq reading] outline failed:", e);
    return singleCallReadingGroq(doc);
  }
  const norm = normalizeGroqOutline(outlineRes.passages, outlineRes.lastQuestion);
  if (norm.length === 0) return singleCallReadingGroq(doc);

  const totalQuestions = norm[norm.length - 1].lastQuestion || outlineRes.lastQuestion || 40;

  // Phase 2: extract each passage on its own (small output — never truncated),
  // retrying a short passage with a wider window so no question is dropped.
  const parts: ReadingExamPart[] = [];
  for (let i = 0; i < norm.length; i++) {
    parts.push(await extractPassageBestGroq(doc, norm, i, totalQuestions));
  }

  if (parts.every((p) => p.questions.length === 0)) return singleCallReadingGroq(doc);

  const produced = parts.reduce((n, p) => n + p.questions.length, 0);
  const expectedTotal = norm.reduce((n, o) => n + Math.max(0, o.lastQuestion - o.firstQuestion + 1), 0);
  const missing = Math.max(0, expectedTotal - produced);
  const emptyParts = parts.filter((p) => p.questions.length === 0).length;
  let notes = "";
  if (emptyParts > 0) {
    notes = `Có ${emptyParts} bài đọc chưa lấy được câu hỏi — hãy bấm "Tạo lại" hoặc kiểm tra lại file.`;
  } else if (missing > 0) {
    notes = `Mới tạo ${produced}/${expectedTotal} câu — còn ${missing} câu chưa lấy được. Hãy bấm "Tạo lại" hoặc kiểm tra lại file.`;
  }
  return { parts, notes };
}

/** Generate a Vietnamese meaning + an English example sentence for a word. */
export async function defineWordGroq(
  term: string,
): Promise<{ definition: string; example: string }> {
  const text = await groqChat(
    [
      {
        role: "system",
        content: `You help Vietnamese learners study English vocabulary.
For the given English word or phrase, return ONLY valid JSON:
{"definition":"<nghĩa tiếng Việt ngắn gọn, rõ ràng — có thể kèm loại từ>","example":"<one natural English example sentence using the word>"}`,
      },
      { role: "user", content: `Word/phrase: ${term}` },
    ],
    { jsonMode: true, temperature: 0.3, maxTokens: 300 },
  );
  const p = extractJSON(text) as { definition?: string; example?: string };
  return { definition: p.definition ?? "", example: p.example ?? "" };
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
