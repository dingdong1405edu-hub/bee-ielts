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
