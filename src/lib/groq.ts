import { isAnswerCorrect } from "@/lib/utils";
import { getApiKey } from "@/lib/api-keys";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
// Groq's free-tier rate/quota limits are PER-MODEL. When the primary is throttled
// or has burned its daily token budget (429), these take over automatically — each
// has its own separate bucket, so generation keeps working without the teacher
// waiting or touching anything. Ordered best-quality-first; both still emit valid
// structured JSON for reading/listening generation.
const READING_FALLBACK_MODELS = ["meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.1-8b-instant"];

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqOptions {
  model?: string;
  /** Models to fall back to when the primary is rate-limited/exhausted (429).
   *  Each Groq model has its OWN free-tier bucket, so rotating to one keeps
   *  generation alive without the caller waiting or retrying by hand. */
  fallbackModels?: string[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** How many times to retry a 429/5xx before giving up (default 2). The
   *  multi-call reading path raises this so it can pace itself under the free
   *  tier's tokens-per-minute cap instead of failing. */
  maxRetries?: number;
  /** Per-request wall-clock timeout in ms (default 60s). A hung request aborts
   *  and (if retries remain) retries, so one stalled call can't block the whole
   *  multi-call reading pipeline until the route's 300s cap. */
  timeoutMs?: number;
}

export async function groqChat(messages: GroqMessage[], opts: GroqOptions = {}): Promise<string> {
  const key = await getApiKey("GROQ");
  if (!key) throw new Error("GROQ_API_KEY not set");

  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 60000;
  // Try the primary model, then any fallbacks. Free-tier limits are per-model, so
  // when one is throttled/exhausted (429) the next has a fresh bucket — generation
  // self-heals instead of failing and asking the teacher to "wait a minute".
  const models = [opts.model ?? DEFAULT_MODEL, ...(opts.fallbackModels ?? [])];

  let lastErr = "";
  for (let mi = 0; mi < models.length; mi++) {
    const isLastModel = mi === models.length - 1;
    const body: Record<string, unknown> = {
      model: models[mi],
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2500,
    };
    if (opts.jsonMode) body.response_format = { type: "json_object" };

    for (let attempt = 0; ; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
      } catch (e) {
        // Timeout/abort or network error — retry this model if attempts remain,
        // else fall through to the next model (if any).
        lastErr = e instanceof Error ? e.message : String(e);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 4000));
          continue;
        }
        break;
      } finally {
        clearTimeout(timer);
      }
      if (res.ok) {
        const data = (await res.json()) as { choices: { message: { content: string } }[] };
        return data.choices[0]?.message?.content ?? "";
      }
      const txt = await res.text();
      lastErr = `Groq ${res.status}: ${txt.slice(0, 200)}`;
      // A bad/expired key fails identically on EVERY model — surface it now so the
      // teacher sees the real "key invalid" reason instead of a rate-limit guess.
      if (res.status === 401 || res.status === 403) throw new Error(lastErr);
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "", 10);
      const tooLarge = res.status === 429 && /request too large/i.test(txt);
      // A per-minute spike clears fast: one short same-model retry (only if the
      // server's retry-after is small). A long/absent wait means the budget is
      // spent — jump straight to the next model rather than stall.
      if (!tooLarge && res.status === 429 && attempt < 1 && Number.isFinite(retryAfter) && retryAfter <= 10) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      // Transient server errors: back off and retry the SAME model.
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 4000));
        continue;
      }
      // Otherwise this model is done (429 exhausted, too-large, or a 4xx). Move on
      // to the next model, which has its own bucket / different token ceiling.
      break;
    }
    if (isLastModel) break;
  }
  throw new Error(lastErr || "Groq request failed");
}

/**
 * Moderate an image with a Groq vision model.
 * Returns { safe: false } if the image looks inappropriate for a learning
 * community (nudity, sexual content, violence/gore, weapons, drugs, hate
 * symbols, etc.). On any error the caller should treat the image as unsafe.
 */
export async function moderateImageGroq(dataUrl: string): Promise<{ safe: boolean; reason: string }> {
  const key = await getApiKey("GROQ");
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

/**
 * Parse a JSON object that may be TRUNCATED (the model hit max_tokens mid-output).
 * First tries a clean parse; on failure it scans the text — ignoring string
 * contents — remembers the position right AFTER the last fully-closed nested
 * element, cuts there, and appends the closing brackets that were still open, so
 * `JSON.parse` succeeds on the salvageable prefix. This turns a cut-off reading
 * response (which used to throw away ALL questions) into the questions that DID
 * finish. Throws only if nothing at all is recoverable.
 */
function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");
  const s = trimmed.slice(start);
  const lastClose = s.lastIndexOf("}");
  if (lastClose !== -1) {
    try {
      return JSON.parse(s.slice(0, lastClose + 1));
    } catch {
      /* truncated or malformed — fall through to bracket repair */
    }
  }
  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  let cut = -1;
  let cutStack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") {
      stack.pop();
      // Just closed a nested element while still inside an outer container — a safe
      // place to cut (keeps every element completed up to here).
      if (stack.length >= 1) {
        cut = i + 1;
        cutStack = stack.slice();
      }
    }
  }
  if (cut === -1) throw new Error("Truncated JSON with no salvageable element");
  let repaired = s.slice(0, cut);
  for (let k = cutStack.length - 1; k >= 0; k--) repaired += cutStack[k] === "{" ? "}" : "]";
  return JSON.parse(repaired);
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
    // Same auto-fallback as reading: if the primary model is 429'd, another model's
    // bucket takes over so building the answer key from an upload never dead-ends.
    { jsonMode: true, temperature: 0.2, maxTokens: 3500, fallbackModels: READING_FALLBACK_MODELS },
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
const READING_QUESTION_RULES = `SPECIAL BLOCKS — if a passage contains a TABLE, a MAP/PLAN/DIAGRAM, or a FLOW-CHART / PROCESS diagram, put ONE of these objects INSIDE the "questions" array at the position where it appears (in question order), INSTEAD of listing those numbered items separately:

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

FLOW-CHART / PROCESS completion (boxes joined by arrows, with numbered gaps — recreate the boxes IN ARROW ORDER):
{
  "type": "FLOWCHART",
  "steps": [ "manager (having just obtained {{18}})", "playing with language for a long time", "{{20}} set of words", "obeyed only at {{21}}", "can cause lack of {{22}}", "want {{23}} payback" ],
  "blanks": [ { "number": 18, "answer": "<exact word(s) from passage; / for alternatives>", "explanation": "<tiếng Việt>" }, { "number": 20, "answer": "...", "explanation": "..." } ]
}
- "steps" = each box's text as ONE string, listed in the order the arrows flow (which matches the question numbering). Copy the box text verbatim; put "{{N}}" where a gap is. A box WITHOUT a gap is still a step — keep it (no marker) so the process reads correctly.
- "blanks" = every gap: number + answer (word-limit rules as FILL_BLANK) + Vietnamese explanation.
- Emit a FLOWCHART (NOT separate sentence-completion questions) whenever the file shows a flow-chart / process diagram: boxes or steps joined by arrows with numbered blanks.
Only emit TABLE/MAP/FLOWCHART when the file actually has one. Do NOT invent them.

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

BOUNDARIES: MỘT passage thường có NHIỀU nhóm câu hỏi khác loại (ví dụ Questions 1–6 nối tiêu đề, 7–10 True/False/Not Given, 11–13 điền từ) — TẤT CẢ các nhóm đó thuộc CÙNG MỘT part. Chỉ mở part MỚI khi sang bài đọc khác (mốc "READING PASSAGE 2/3"). TUYỆT ĐỐI không tách các nhóm câu hỏi của cùng một bài đọc thành nhiều part, và không đẩy những câu CUỐI của passage này sang part sau. Ví dụ: nếu Passage 1 có câu 1–13 thì part 1 phải chứa ĐỦ câu 1–13, không được để câu 11–13 rơi sang part 2.

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
          "explanation": "<tiếng Việt, 1 câu ngắn gọn>"
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
  let fcCounter = 0;

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
      if (order.length === 0) {
        // Model listed blanks[] but omitted the {{N}} markers in the grid cells —
        // don't drop the whole group; emit its blanks as plain fill-ins so no
        // question is lost (teacher can refine rendering later).
        const nums = [...blankByNum.keys()].sort((a, b) => a - b);
        if (nums.length === 0) continue;
        nums.forEach((num, idx) => {
          const bb = blankByNum.get(num)!;
          questions.push({
            number: num,
            type: "FILL_BLANK",
            prompt: idx === 0 ? tableStr : `(${num})`,
            options: null,
            answer: bb.answer,
            explanation: bb.explanation,
            formGroup: null,
          });
        });
        continue;
      }
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
      // Any blank listed in blanks[] but whose {{N}} marker was missing from the grid
      // is still emitted (as a plain fill-in) so no question is silently lost.
      for (const [num, b] of blankByNum) {
        if (!order.includes(num)) {
          questions.push({ number: num, type: "FILL_BLANK", prompt: `(${num})`, options: null, answer: b.answer, explanation: b.explanation, formGroup: null });
        }
      }
      continue;
    }

    // ---- FLOW-CHART / PROCESS completion → fc-formGroup FILL_BLANK questions -
    if (rawType === "FLOWCHART" || rawType === "FLOW_CHART" || rawType === "FLOW" || rawType === "PROCESS") {
      const steps = (Array.isArray(o.steps) ? o.steps : Array.isArray(o.lines) ? o.lines : Array.isArray(o.rows) ? o.rows : []).map((s) =>
        String(s ?? ""),
      );
      const blankByNum = new Map<number, { answer: string; explanation: string }>();
      for (const b of Array.isArray(o.blanks) ? o.blanks : []) {
        const bo = (b ?? {}) as Record<string, unknown>;
        const bn = typeof bo.number === "number" ? bo.number : parseInt(String(bo.number ?? ""), 10);
        if (Number.isFinite(bn)) {
          blankByNum.set(bn, { answer: String(bo.answer ?? "").trim(), explanation: stripCjk(String(bo.explanation ?? "")) });
        }
      }
      // Each step is one box (its own line); "{{N}}" → an inline blank. FlowBlanks
      // stitches the members' prompts back (join ""), splits on "\n", draws each
      // line as a box with a ↓ arrow between them. Boxes with no gap are kept as
      // static text lines so the process reads correctly.
      const order: number[] = [];
      const flowStr = steps
        .map((step) => step.replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, d) => { order.push(parseInt(d, 10)); return "_____"; }))
        .join("\n");
      if (order.length === 0) {
        // Model listed blanks[] but omitted the {{N}} markers in the steps — don't
        // drop the whole group; emit its blanks as plain fill-ins so no question is lost.
        const nums = [...blankByNum.keys()].sort((a, b) => a - b);
        if (nums.length === 0) continue;
        nums.forEach((num, idx) => {
          const bb = blankByNum.get(num)!;
          questions.push({
            number: num,
            type: "FILL_BLANK",
            prompt: idx === 0 ? flowStr : `(${num})`,
            options: null,
            answer: bb.answer,
            explanation: bb.explanation,
            formGroup: null,
          });
        });
        continue;
      }
      fcCounter++;
      const fg = `fc${fcCounter}`;
      order.forEach((num, idx) => {
        const b = blankByNum.get(num) ?? { answer: "", explanation: "" };
        questions.push({
          number: num,
          type: "FILL_BLANK",
          prompt: idx === 0 ? flowStr : "", // whole flow-chart rides on the first member
          options: null,
          answer: b.answer,
          explanation: b.explanation,
          formGroup: fg,
        });
      });
      // A blank in blanks[] whose {{N}} marker was missing from the steps is still
      // emitted (plain fill-in) so no question is silently lost.
      for (const [num, b] of blankByNum) {
        if (!order.includes(num)) {
          questions.push({ number: num, type: "FILL_BLANK", prompt: `(${num})`, options: null, answer: b.answer, explanation: b.explanation, formGroup: null });
        }
      }
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

/** Turn a raw Groq failure message into a clear Vietnamese reason for the teacher
 *  (so a masked "AI chưa đọc được" no longer hides a 401/429/timeout root cause). */
function groqReadingErrorHint(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("groq_api_key not set")) return "Máy chủ chưa cấu hình GROQ_API_KEY.";
  if (m.includes("401") || m.includes("invalid api key") || m.includes("invalid_api_key") || m.includes("unauthorized"))
    return "Khoá Groq trên máy chủ KHÔNG hợp lệ (401). Hãy kiểm tra/cập nhật GROQ_API_KEY trên Railway rồi Redeploy.";
  if (m.includes("request too large") || m.includes("413"))
    return "Đề quá dài cho 1 lượt Groq. Hãy tách nhỏ đề, hoặc thêm khoá Anthropic để đọc trọn PDF.";
  if (m.includes("429") || m.includes("rate limit") || m.includes("tokens per minute") || m.includes("quota"))
    return "Groq đã hết lượt miễn phí hôm nay trên tất cả mô hình dự phòng (429). Thử lại sau vài phút, hoặc dán một khoá Groq khác ở trang Admin → Khoá API (có hiệu lực ngay, không cần Redeploy).";
  if (m.includes("timeout") || m.includes("abort") || m.includes("timed out"))
    return "Groq phản hồi quá lâu (timeout). Bấm Tạo lại, hoặc soạn thủ công.";
  if (m.includes("5") && m.includes("groq 5")) return "Máy chủ Groq đang gặp sự cố (5xx). Thử lại sau ít phút.";
  return `Groq báo lỗi: ${msg.slice(0, 140)}`;
}

/** ONE Groq call over a slice of the paper → parts (+ the raw error if it failed).
 *  Kept small enough to fit the free tier's per-minute token budget (so it doesn't
 *  storm the rate limit) and NEVER throws — returns { parts: [], error } on failure
 *  so the caller degrades gracefully AND can tell the teacher WHY. When
 *  `tailFrom > 0` it asks only for passages whose questions come AFTER that number
 *  (used to recover a dropped final passage). When `opts.singlePassage` the slice is
 *  ONE passage, so it must return exactly that passage with ALL its questions. */
async function readingCallGroq(
  slice: string,
  tailFrom: number,
  opts: { model?: string; fallbackModels?: string[]; singlePassage?: boolean } = {},
): Promise<{ parts: ReadingExamPart[]; error?: string }> {
  const scope = opts.singlePassage
    ? `Toàn bộ văn bản trên là MỘT phần đề đọc kèm câu hỏi của nó. Trả về ĐÚNG 1 "part": LẤY HẾT MỌI câu hỏi CÓ TRONG văn bản này (đừng bỏ câu nào), KHÔNG bịa thêm câu không có.`
    : tailFrom > 0
      ? `CHỈ lấy các bài đọc chứa câu hỏi có SỐ THỨ TỰ LỚN HƠN ${tailFrom} (các bài ở phần SAU của đề, thường tới câu 40). Bỏ qua các câu đã ở phần đầu.`
      : `Lấy TẤT CẢ các bài đọc và MỌI câu hỏi trong đề (thường tới câu 40) — đừng bỏ bài nào, đừng bỏ câu nào.`;
  const label = opts.singlePassage
    ? "TEST PAPER TEXT (MỘT phần đề + câu hỏi của nó):"
    : "TEST PAPER TEXT (nhiều bài đọc + câu hỏi):";
  const splitRule = opts.singlePassage
    ? "Trả về ĐÚNG 1 part."
    : 'TÁCH mỗi bài đọc riêng thành 1 "part" (đừng gộp nhiều bài vào một).';
  const userMessage = `${label}
${slice}

${splitRule} ${scope} Với mỗi bài: trích NGUYÊN VĂN, NỐI LẠI các dòng bị ngắt giữa câu thành đoạn văn trôi chảy, giữ ĐÚNG số thứ tự câu hỏi gốc, chấm đáp án đúng theo ĐÚNG ANSWER/OPTIONS RULES, và viết lời giải NGẮN (1 câu tiếng Việt). Nếu đề có BẢNG thì trả về block "TABLE"; nếu có BẢN ĐỒ/SƠ ĐỒ/PLAN thì VẼ LẠI bằng SVG trong block "MAP". Trả về JSON only.`;
  try {
    const text = await groqChat(
      [
        { role: "system", content: READING_EXAM_SYS },
        { role: "user", content: userMessage },
      ],
      // Output bounded to fit Groq free tier's ~12k tokens/minute in ONE request
      // (input ~3-4k + output ~6k stays under the ceiling → no "request too large").
      // 6000 gives a whole 13-14 question passage room to finish; parseJsonLoose
      // salvages the questions that finished if we still hit the cap.
      // model/fallbackModels: per-passage calls each prefer a DIFFERENT model so they
      // don't drain one free-tier bucket, and still fall back if that model is 429'd.
      {
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 6000,
        maxRetries: 2,
        timeoutMs: 50000,
        model: opts.model,
        fallbackModels: opts.fallbackModels ?? READING_FALLBACK_MODELS,
      },
    );
    return { parts: parseReadingExamParts(parseJsonLoose(text) as Record<string, unknown>).parts };
  } catch (e) {
    console.error("[groq reading] call failed:", e);
    return { parts: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Numbers word → digit for "Reading Passage One/Two/Three". */
const PASSAGE_WORD: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };

/**
 * From the paper's OWN structure markers, work out where each reading passage
 * STARTS (its first question number). IELTS papers mark passages as "READING
 * PASSAGE 1/2/3" and introduce each block with "Questions X–Y". We pair each
 * passage header with the first "Questions X–…" after it → the passage start
 * numbers, e.g. [1, 14, 27]. Returns [] (caller keeps the AI grouping) unless it
 * finds ≥2 headers with plausible, strictly-increasing starts.
 */
function detectPassageStarts(doc: string): number[] {
  const headers: { pos: number; passage: number }[] = [];
  const hre = /reading\s+passage\s+(\d+|one|two|three|four)/gi;
  for (let m = hre.exec(doc); m; m = hre.exec(doc)) {
    const tok = m[1].toLowerCase();
    const n = /^\d+$/.test(tok) ? parseInt(tok, 10) : PASSAGE_WORD[tok];
    if (n) headers.push({ pos: m.index, passage: n });
  }
  if (headers.length < 2) return [];
  // First textual position of each passage number (ignore later repeats).
  const firstPos = new Map<number, number>();
  for (const h of headers) if (!firstPos.has(h.passage)) firstPos.set(h.passage, h.pos);
  const ordered = [...firstPos.entries()].sort((a, b) => a[0] - b[0]);

  const ranges: { pos: number; start: number }[] = [];
  const qre = /questions?\s+(\d+)\s*(?:[-–—]|to)\s*\d+/gi;
  for (let m = qre.exec(doc); m; m = qre.exec(doc)) ranges.push({ pos: m.index, start: parseInt(m[1], 10) });

  const starts: number[] = [];
  for (const [, pos] of ordered) {
    const r = ranges.find((x) => x.pos >= pos);
    if (r) starts.push(r.start);
  }
  const uniq = [...new Set(starts)].sort((a, b) => a - b);
  if (uniq.length < 2) return [];
  if (uniq[0] > 2) return []; // Passage 1 always starts at Q1 (Q2 at most) — else a
  // stray "Reading Passage 2" mention fooled us; don't risk breaking a good grouping.
  for (let i = 1; i < uniq.length; i++) {
    const gap = uniq[i] - uniq[i - 1];
    if (gap < 3 || gap > 25) return []; // implausible spacing → don't trust it
  }
  return uniq;
}

/** Every "Questions X–Y" group the paper declares, with the char position of the
 *  declaration. IELTS always heads each question group this way, so this tells us
 *  how many questions exist and where — independent of passage headers. */
function detectQuestionRanges(doc: string): { start: number; end: number; pos: number }[] {
  const out: { start: number; end: number; pos: number }[] = [];
  const re = /questions?\s+(\d+)\s*(?:[-–—]|to)\s*(\d+)/gi;
  for (let m = re.exec(doc); m; m = re.exec(doc)) {
    const s = parseInt(m[1], 10);
    const e = parseInt(m[2], 10);
    if (Number.isFinite(s) && Number.isFinite(e) && e >= s && e - s <= 30 && s >= 1 && e <= 60) {
      out.push({ start: s, end: e, pos: m.index });
    }
  }
  return out;
}

/**
 * Char positions where each reading passage STARTS. Robust to how papers label
 * passages: STRONG markers ("Reading Passage N", "Section N", "Part N") match
 * anywhere (PDF reflow often glues them mid-line); a bare "Passage N" counts only at
 * line start (so prose "…in the next passage two…" is ignored). If passage 1 is
 * unlabeled (first marker is #2) but there is real text above it, a boundary at 0 is
 * prepended. Returns the start positions (≥2, strictly increasing) or [] when there
 * is no reliable multi-passage structure (caller then uses a single part).
 */
function passageBoundaries(doc: string): number[] {
  const hits: { pos: number; num: number }[] = [];
  const add = (re: RegExp) => {
    for (let m = re.exec(doc); m; m = re.exec(doc)) {
      const tok = m[1].toLowerCase();
      const n = /^\d+$/.test(tok) ? parseInt(tok, 10) : PASSAGE_WORD[tok] ?? 0;
      if (n >= 1 && n <= 6) hits.push({ pos: m.index, num: n });
    }
  };
  // "Reading Passage N" never occurs in prose → match anywhere (catches a header the
  // PDF extractor glued mid-line). "Section/Part/Passage N" DO appear in prose and as
  // sub-headings → only count them at line start.
  add(/reading\s+passage\s+(\d+|one|two|three|four)\b/gi);
  add(/^[ \t]*(?:section|part|passage)\s+(\d+|one|two|three|four)\b/gim);
  if (hits.length === 0) return [];
  const firstPos = new Map<number, number>();
  for (const h of hits.sort((a, b) => a.pos - b.pos)) if (!firstPos.has(h.num)) firstPos.set(h.num, h.pos);
  let ordered = [...firstPos.entries()].map(([num, pos]) => ({ num, pos })).sort((a, b) => a.num - b.num);
  // Passage 1 often has no label (paper just begins, then says "READING PASSAGE 2").
  if (ordered[0].num === 2 && ordered[0].pos > 400) ordered = [{ num: 1, pos: 0 }, ...ordered];
  if (ordered[0].num !== 1) return [];
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].num !== ordered[i - 1].num + 1) return []; // gap → don't trust it
    if (ordered[i].pos <= ordered[i - 1].pos) return []; // positions must increase
  }
  return ordered.length >= 2 ? ordered.map((o) => o.pos) : [];
}

interface ExtractBlock {
  start: number;
  end: number;
  passageIndex: number;
}

/**
 * Cut the paper into extraction blocks. When passages are detectable, ONE block per
 * WHOLE passage (its full char span) — so every block carries its reading text and no
 * passage is ever split across calls (a split later block would have no passage to
 * grade against). Otherwise the paper is chunked by "Questions X–Y" groups (≤13 each)
 * into a single part. Either way we extract by POSITION and renumber by position, so
 * we never depend on the model preserving question numbers. Returns [] when the paper
 * declares no question groups at all (caller uses a single call).
 */
function planExtractionBlocks(doc: string): ExtractBlock[] {
  const ranges = detectQuestionRanges(doc).sort((a, b) => a.pos - b.pos);
  if (ranges.length === 0) return [];
  const bounds = passageBoundaries(doc);

  if (bounds.length >= 2) {
    // One block per passage span. Trust the boundaries only if EVERY span holds a
    // question group — a span with none means the "boundary" was a sub-heading
    // ("Section 1: Intro" inside a passage) or a stray mention, and splitting there
    // would divide or drop real passage text. In that case fall through to chunking.
    const blocks: ExtractBlock[] = [];
    let allHaveQuestions = true;
    for (let i = 0; i < bounds.length; i++) {
      const start = bounds[i];
      const end = i + 1 < bounds.length ? bounds[i + 1] : doc.length;
      if (ranges.some((r) => r.pos >= start && r.pos < end)) blocks.push({ start, end, passageIndex: blocks.length });
      else allHaveQuestions = false;
    }
    if (blocks.length >= 2 && allHaveQuestions) return blocks;
  }

  // No reliable passage structure — chunk by question groups (≤13 questions each so a
  // reply never truncates), all in ONE part (passageIndex 0). Blocks tile by position.
  const MAX_Q = 13;
  const groups: { firstPos: number; qCount: number }[] = [];
  for (const r of ranges) {
    const rCount = Math.max(1, r.end - r.start + 1);
    const cur = groups[groups.length - 1];
    if (cur && cur.qCount + rCount <= MAX_Q) cur.qCount += rCount;
    else groups.push({ firstPos: r.pos, qCount: rCount });
  }
  const starts: number[] = [];
  for (let i = 0; i < groups.length; i++) {
    let s = i === 0 ? 0 : groups[i].firstPos;
    if (i > 0) s = Math.max(s, starts[i - 1] + 1);
    starts.push(s);
  }
  return groups.map((g, i) => ({
    start: starts[i],
    end: i + 1 < starts.length ? starts[i + 1] : doc.length,
    passageIndex: 0,
  }));
}

/**
 * Position-based reading extractor — the robust path. One Groq call per block (each
 * ≤ ~13 questions, on rotating models so no single free-tier bucket drains), taking
 * WHATEVER questions come back and renumbering them by position 1..N. Blocks of the
 * same passage merge into one part. Never trusts the model's numbering, so a chunk
 * whose numbers were restarted is NOT dropped (the old number-filter bug).
 */
async function generateByBlocks(doc: string): Promise<{ parts: ReadingExamPart[]; error: string }> {
  const blocks = planExtractionBlocks(doc);
  if (blocks.length === 0) return { parts: [], error: "" };
  const MODELS = [DEFAULT_MODEL, "meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.1-8b-instant"];

  const results: { blockIndex: number; passageIndex: number; parts: ReadingExamPart[] }[] = [];
  let lastError = "";
  for (let i = 0; i < blocks.length; i++) {
    const model = MODELS[i % MODELS.length];
    const fallbackModels = MODELS.filter((m) => m !== model);
    const text = doc.slice(blocks[i].start, Math.min(blocks[i].end, blocks[i].start + 16000));
    let r = await readingCallGroq(text, 0, { model, fallbackModels, singlePassage: true });
    // A whole passage came back empty (transient 429/parse miss) — try once more on a
    // different primary model so we don't silently lose that passage and shift the rest.
    if (r.parts.every((p) => p.questions.length === 0)) {
      const alt = MODELS[(i + 1) % MODELS.length];
      const r2 = await readingCallGroq(text, 0, { model: alt, fallbackModels: MODELS.filter((m) => m !== alt), singlePassage: true });
      if (r2.parts.some((p) => p.questions.length > 0) || r2.error) r = r2;
    }
    if (r.error) lastError = r.error;
    results.push({ blockIndex: i, passageIndex: blocks[i].passageIndex, parts: r.parts });
  }

  // Merge by passage, in doc order, renumbering by POSITION (never the model's number).
  const acc = new Map<number, { questions: ReadingExamQuestion[]; figures: ReadingFigure[]; passages: string[] }>();
  const order: number[] = [];
  let running = 0;
  for (const res of results) {
    if (!acc.has(res.passageIndex)) {
      acc.set(res.passageIndex, { questions: [], figures: [], passages: [] });
      order.push(res.passageIndex);
    }
    const a = acc.get(res.passageIndex)!;
    for (const p of res.parts) {
      const oldToNew = new Map<number, number>();
      for (const q of p.questions) {
        running += 1;
        oldToNew.set(q.number, running);
        // Namespace the formGroup by source block so two tables/flow-charts that both
        // came back as "tbl1"/"fc1" from different blocks never collide in one part.
        a.questions.push({ ...q, number: running, formGroup: q.formGroup ? `b${res.blockIndex}_${q.formGroup}` : null });
      }
      const lastNum = a.questions.length ? a.questions[a.questions.length - 1].number : running;
      for (const f of p.figures) a.figures.push({ ...f, atNumber: oldToNew.get(f.atNumber) ?? lastNum });
      if (p.passage) a.passages.push(p.passage);
    }
  }

  const parts: ReadingExamPart[] = [];
  for (const pIdx of order) {
    const a = acc.get(pIdx)!;
    if (a.questions.length === 0) continue;
    // Keep ALL distinct passage texts (a one-part header-less paper may have gathered
    // several) so no reading text is lost; the common one-block part just uses its own.
    const passage = [...new Set(a.passages.filter(Boolean))].join("\n\n");
    parts.push({ title: "", passage, questions: a.questions, figures: a.figures });
  }
  return { parts, error: lastError };
}

/**
 * Fix questions the model put in the WRONG passage (e.g. the file's Passage 1 has
 * 13 questions but the model kept 10 and spilled 3 into Passage 2). The model
 * reads front-to-back, so its questions are already in reading ORDER; we only
 * need the per-passage COUNTS, which the paper's markers give us via the gaps
 * between passage starts ([1,14,27] → counts [13,13,…]). We then re-slice the
 * reading-ordered questions into the correct parts. Robust even if the model
 * restarted its numbering (it never relies on the numbers). Markers not found →
 * parts returned unchanged.
 */
function rebinPartsByDocBoundaries(parts: ReadingExamPart[], doc: string): ReadingExamPart[] {
  const starts = detectPassageStarts(doc);
  if (starts.length < 2) return parts;

  // Flatten in reading order, carrying each figure with its question.
  type Item = { q: ReadingExamQuestion; fig?: ReadingFigure; src: number };
  const flat: Item[] = [];
  parts.forEach((part, src) => {
    const startIdx = flat.length;
    const usedFig = new Set<number>();
    for (const q of part.questions) {
      let fig: ReadingFigure | undefined;
      for (let fi = 0; fi < part.figures.length; fi++) {
        if (!usedFig.has(fi) && part.figures[fi].atNumber === q.number) { fig = part.figures[fi]; usedFig.add(fi); break; }
      }
      flat.push({ q, fig, src });
    }
    // A figure that matched no question number rides on the part's first item.
    if (flat.length > startIdx && usedFig.size < part.figures.length && !flat[startIdx].fig) {
      for (let fi = 0; fi < part.figures.length; fi++) {
        if (!usedFig.has(fi)) { flat[startIdx].fig = part.figures[fi]; usedFig.add(fi); break; }
      }
    }
  });
  if (flat.length === 0) return parts;

  // Per-passage target counts from the start gaps; the last passage takes the rest.
  const counts = starts.map((s, i) => (i < starts.length - 1 ? starts[i + 1] - s : Infinity));
  if (counts.some((c) => c <= 0)) return parts;

  const newParts: ReadingExamPart[] = [];
  let pos = 0;
  let running = 0;
  for (let i = 0; i < counts.length && pos < flat.length; i++) {
    const take = Math.min(counts[i], flat.length - pos);
    const slice = flat.slice(pos, pos + take);
    pos += take;
    if (slice.length === 0) continue;
    // Title/passage from the source part that contributed the most questions here.
    const tally = new Map<number, number>();
    for (const it of slice) tally.set(it.src, (tally.get(it.src) ?? 0) + 1);
    const domSrc = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const source = parts[domSrc];
    const questions: ReadingExamQuestion[] = [];
    const figures: ReadingFigure[] = [];
    for (const it of slice) {
      running += 1;
      questions.push({ ...it.q, number: running });
      if (it.fig) figures.push({ ...it.fig, atNumber: running });
    }
    newParts.push({ title: source.title, passage: source.passage, questions, figures });
  }
  return newParts.length > 0 ? newParts : parts;
}

/**
 * Groq reading generator — the ONLY engine when Claude isn't configured.
 *
 * ROBUST path (paper declares "Questions X–Y" groups): position-based block
 * extraction — the paper is sliced at the CHAR POSITIONS of its question-group
 * headers into blocks of ≤13 questions, each extracted on a rotating model and
 * renumbered by POSITION. It never trusts the model's own numbering (weak models
 * restart at 1), so no chunk is ever silently dropped — this is what fixes
 * "29 declared but only 14 produced / wrong split". Blocks of the same passage
 * merge into one part.
 *
 * FALLBACK path (no declared groups — tiny/odd paper): a single bounded call,
 * parsed loosely, then re-binned by whatever markers exist. Tables/maps ride the
 * shared TABLE/MAP blocks either way.
 */
export async function generateReadingExamGroq(input: { documentText: string }): Promise<ReadingExamMulti> {
  const doc = input.documentText;

  let parts: ReadingExamPart[];
  let lastError = "";

  const blocks = planExtractionBlocks(doc);
  if (blocks.length > 0) {
    const r = await generateByBlocks(doc);
    parts = r.parts;
    lastError = r.error;
    // Total failure of the block path (all blocks errored/empty) → one plain call.
    if (parts.every((p) => p.questions.length === 0)) {
      const r1 = await readingCallGroq(doc.slice(0, 16000), 0);
      if (r1.parts.some((p) => p.questions.length > 0)) parts = rebinPartsByDocBoundaries(r1.parts, doc);
      if (r1.error) lastError = r1.error;
    }
  } else {
    // No declared "Questions X–Y" groups (tiny/odd paper) — one bounded call.
    const r1 = await readingCallGroq(doc.slice(0, 16000), 0);
    parts = r1.parts;
    lastError = r1.error ?? "";
    if (parts.every((p) => p.questions.length === 0)) {
      const r2 = await readingCallGroq(doc.slice(0, 11000), 0);
      parts = r2.parts;
      if (r2.error) lastError = r2.error;
    }
    parts = rebinPartsByDocBoundaries(parts, doc);
  }

  const declaredMax = (() => {
    const rs = detectQuestionRanges(doc);
    return rs.length ? Math.max(...rs.map((r) => r.end)) : 0;
  })();
  const produced = parts.reduce((n, p) => n + p.questions.length, 0);
  let notes = "";
  if (produced === 0) {
    // Surface the REAL reason (401/429/timeout…) instead of a generic message —
    // otherwise a bad key on the server just looks like "AI chưa đọc được".
    notes = lastError
      ? groqReadingErrorHint(lastError)
      : "AI chưa đọc được câu hỏi trong file — có thể file là ảnh scan (không có chữ). Hãy thử lại hoặc nhập đáp án thủ công.";
  } else if (declaredMax >= 3 && produced < declaredMax - 1) {
    notes = `Mới tạo ${produced}/${declaredMax} câu — có thể còn thiếu vài câu (một phần đề bị lỗi tải). Bấm "Tạo lại" để bổ sung, hoặc thêm khoá Anthropic để AI đọc trọn đề.`;
  } else if (declaredMax === 0 && produced < 30) {
    notes = `Mới tạo ${produced} câu — Groq (bản miễn phí) giới hạn dung lượng mỗi lượt nên có thể còn thiếu. Bấm "Tạo lại" để bổ sung, hoặc thêm khoá Anthropic để AI đọc trọn đề.`;
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
