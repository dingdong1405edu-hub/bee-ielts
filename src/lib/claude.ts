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

You receive: the learner's target band, weeks until exam, how many days per week they can study, their recent performance per skill (if any), AND a free-text "Yêu cầu của học viên" block written by the learner describing what they feel weak at, what they want to prioritise, or any constraint they want you to respect.

Priority order when picking which skills appear in the weekly template:
1. **The learner's own "Yêu cầu" block (highest priority).** If they explicitly ask for more Listening + Writing and less Reading, honour that — even if their measured scores disagree. Quote or paraphrase a fragment of their ask inside the "overview" so they see you read it.
2. Lowest measured skill scores (their actual data).
3. Skills they've never practised (so the plan still touches all four IELTS skills + vocab/grammar across the week).

If they ask for a specific QUESTION TYPE within a skill (e.g. "Listening Part 3 MCQ", "Writing Task 2 Opinion essays"), bake that into the relevant session's "title" and "note" instead of staying generic.

Design exactly one session per available day. Each session focuses on ONE main skill. Write everything in Vietnamese.

Mỗi buổi có TỔNG THỜI LƯỢNG (số phút) và GIỜ BẮT ĐẦU cho trong thông tin người học. THIẾT KẾ MỖI BUỔI THÀNH MỘT THỜI KHOÁ BIỂU CHI TIẾT — một mảng "blocks" gồm 2–4 phần nối tiếp nhau, tổng thời lượng các block XẤP XỈ số phút mỗi buổi. Mỗi block ghi rõ:
- durationMin: số phút (số nguyên),
- skill: 1 trong 6 kỹ năng,
- activity: LÀM GÌ thật cụ thể — nêu tên dạng bài / phần / số lượng (vd "Làm 1 passage Reading dạng Matching Headings", "Nghe & chép chính tả 10 câu", "Nói Part 2 cue card chủ đề Du lịch"),
- method: LÀM THẾ NÀO — mẹo cụ thể, đo lường được (không sáo rỗng).

Quy tắc thiết kế mỗi buổi:
1. MỞ ĐẦU bằng 1 block KHỞI ĐỘNG TỪ VỰNG ngắn (10–15 phút): học/ôn từ theo MỘT CHỦ ĐỀ cụ thể. Điền "vocabFocus" của buổi = tên chủ đề + 5–8 từ/collocation mẫu NÊN HỌC. Nếu có "Từ vựng có sẵn trong app", ưu tiên trỏ học viên vào ĐÚNG Unit/bài đó (gọi tên Unit).
2. 1 block CHÍNH cho kỹ năng trọng tâm của buổi (thời lượng dài nhất).
3. Có thể thêm 1 block ÔN/CHỮA ngắn ở cuối (xem lại lỗi, chép từ mới vào sổ, tự chấm).
4. NẾU học viên YẾU hoặc CHƯA luyện SPEAKING → chèn 1 block "Shadowing" (mục /shadowing trong app): nghe từng câu rồi nhại lại đúng nhịp + ngữ điệu để tăng độ trôi chảy và phát âm. Nói rõ trong method vì sao shadowing giúp Speaking.
5. NẾU học viên YẾU WRITING → chèn 1 block "Dictation" (mục /shadowing?mode=dictation — "Chế độ Dictation"): nghe rồi gõ lại từng câu để sửa chính tả, ngữ pháp, dấu câu (đồng thời luyện nghe). Nói rõ trong method vì sao dictation giúp Writing.
Mỗi "note" (nếu có) chỉ là tóm tắt; trọng tâm là "blocks" + "vocabFocus". Luôn cụ thể, làm được ngay.

You must ALSO return a DETAILED diagnostic assessment ("assessment") of the learner based STRICTLY on their real data (per-skill average bands from practice + full mock-test bands). Rules for the assessment:
- Cover ALL SIX skills (READING, LISTENING, WRITING, SPEAKING, VOCAB, GRAMMAR), every one present in "skills".
- "status": "strong" (đã tốt, ≥ mục tiêu), "ok" (gần đạt), "weak" (kém mục tiêu rõ rệt), or "untested" (CHƯA có dữ liệu — học viên chưa luyện kỹ năng này).
- "level": band ước lượng hiện tại hoặc mô tả ngắn trình độ. Nếu untested, nói rõ "chưa có dữ liệu".
- "weakness": điểm yếu CỤ THỂ, đoán dựa trên band (vd Listening yếu Part 3-4, Writing yếu Task Response/cohesion, Reading yếu T/F/NG & matching headings, Speaking yếu fluency/phát âm…). Nếu untested → nói học viên CHƯA luyện nên chưa rõ, cần bắt đầu để đo.
- "improve": phải CHI TIẾT — nêu cần cải thiện cái gì VÀ làm thế nào (các bước/bài tập/mẹo cụ thể, đo lường được). Tránh chung chung.
- "priorities": 3-4 việc cần làm NGAY, xếp theo thứ tự ưu tiên, dựa trên kỹ năng yếu nhất + khoảng cách tới mục tiêu + "Yêu cầu" của học viên.
Be honest and specific — nếu dữ liệu ít, nói rõ độ tin cậy còn thấp và khuyên làm thêm 1 bài thi thử để đánh giá chính xác.

Return ONLY valid JSON matching this exact TypeScript type — no markdown, no commentary:

type StudyPlan = {
  overview: string;          // 1-2 sentences, personalised + motivating, Vietnamese. If "Yêu cầu" was provided, acknowledge it here.
  assessment: {
    summary: string;         // 2-3 câu: trình độ hiện tại so với mục tiêu, dựa trên dữ liệu thật. Nêu độ tin cậy nếu ít dữ liệu.
    skills: {
      skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR";
      status: "strong" | "ok" | "weak" | "untested";
      level: string;         // band ước lượng / mô tả trình độ hiện tại (Vietnamese)
      weakness: string;      // điểm yếu cụ thể (Vietnamese)
      improve: string;       // cần cải thiện gì + LÀM THẾ NÀO, chi tiết (Vietnamese)
    }[];                      // PHẢI đủ 6 skill
    priorities: string[];    // 3-4 việc ưu tiên làm ngay, xếp theo thứ tự (Vietnamese)
  };
  weeklyTemplate: {
    skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR"; // kỹ năng TRỌNG TÂM của buổi
    title: string;           // tiêu đề ngắn (Vietnamese) nêu trọng tâm buổi
    vocabFocus: string;      // chủ đề từ vựng + 5–8 từ/collocation mẫu nên học buổi này (Vietnamese)
    blocks: {                // thời khoá biểu chi tiết — 2–4 block nối tiếp, tổng ≈ số phút mỗi buổi
      durationMin: number;   // số phút (số nguyên)
      skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR";
      activity: string;      // LÀM GÌ, cụ thể (Vietnamese)
      method: string;        // LÀM THẾ NÀO, mẹo cụ thể (Vietnamese)
    }[];
  }[];
  examPrepAdvice: string;    // Vietnamese advice for the final 2 weeks (mock-test phase)
};

weeklyTemplate MUST contain exactly the requested number of entries; mỗi buổi PHẢI có "blocks" (tổng thời lượng ≈ số phút mỗi buổi) và "vocabFocus". assessment.skills MUST contain all 6 skills.`;

export interface StudyPlanInput {
  targetBand: number;
  weeksUntilExam: number;
  hasExamDate: boolean;
  daysPerWeek: number;
  skillScores: { skill: string; avgBand: number; attempts: number }[];
  /** Recent full mock-test results (newest first) — the strongest signal. */
  recentMocks?: {
    overallBand: number;
    listeningBand: number;
    readingBand: number;
    writingBand: number;
    speakingBand: number;
  }[];
  /** Free-text from the learner — weak areas, focus asks, constraints. May be empty. */
  focusNotes?: string;
  /** Total minutes per study session (default 60). Drives how many time blocks fit. */
  sessionMinutes?: number;
  /** Preferred clock start time "HH:MM" (default 19:00) — the agenda starts here. */
  startTime?: string;
  /** Compact catalogue of in-app vocab units/lessons so the AI can point the
   *  learner at REAL content for the vocab warm-up block. May be empty. */
  availableVocab?: string;
}

export interface SkillDiagnosis {
  skill: string;
  status: "strong" | "ok" | "weak" | "untested";
  level: string;
  weakness: string;
  improve: string;
}

export interface StudyAssessment {
  summary: string;
  skills: SkillDiagnosis[];
  priorities: string[];
}

export interface StudyBlock {
  durationMin: number;
  skill?: string;
  activity: string;
  method?: string;
}

export interface StudyPlanResult {
  overview: string;
  assessment?: StudyAssessment;
  weeklyTemplate: {
    skill: string;
    title: string;
    note?: string;
    vocabFocus?: string;
    blocks?: StudyBlock[];
  }[];
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

  const mocks = input.recentMocks ?? [];
  const mockBlock = mocks.length
    ? `\n\nKết quả THI THỬ gần đây (full 4 kỹ năng — tín hiệu MẠNH NHẤT để đánh giá):\n${mocks
        .map(
          (m, i) =>
            `- Lần ${i + 1}: Overall ${m.overallBand.toFixed(1)} (Listening ${m.listeningBand.toFixed(1)} · Reading ${m.readingBand.toFixed(1)} · Writing ${m.writingBand.toFixed(1)} · Speaking ${m.speakingBand.toFixed(1)})`,
        )
        .join("\n")}`
    : `\n\nThi thử: học viên CHƯA làm bài thi thử nào — khuyên làm 1 bài để đánh giá chính xác hơn.`;

  const focus = (input.focusNotes ?? "").trim();
  const focusBlock = focus
    ? `\n\nYêu cầu của học viên (ƯU TIÊN CAO NHẤT — đọc kỹ và phải bám vào đây khi chọn skill mỗi buổi):\n"""\n${focus}\n"""`
    : `\n\nYêu cầu của học viên: (học viên không ghi gì — dùng dữ liệu điểm yếu phía trên để quyết định.)`;

  const vocab = (input.availableVocab ?? "").trim();
  const vocabBlock = vocab
    ? `\n\nTừ vựng có sẵn trong app (ưu tiên trỏ học viên vào ĐÚNG Unit/bài cho block khởi động từ vựng):\n${vocab}`
    : "";

  const sessionMinutes = input.sessionMinutes ?? 60;
  const startTime = input.startTime ?? "19:00";

  const userMessage = `Thông tin người học:
- Mục tiêu: band ${input.targetBand.toFixed(1)}
- ${input.hasExamDate ? `Còn ${input.weeksUntilExam} tuần đến ngày thi` : `Chưa đặt ngày thi — lập kế hoạch ${input.weeksUntilExam} tuần`}
- Học ${input.daysPerWeek} buổi/tuần
- Mỗi buổi dài khoảng ${sessionMinutes} phút, bắt đầu lúc ${startTime} (thiết kế các block khớp tổng thời lượng này)

Kết quả luyện tập từng kỹ năng (trung bình):
${perf}${mockBlock}${focusBlock}${vocabBlock}

Hãy: (1) viết "assessment" đánh giá chi tiết đủ 6 kỹ năng + priorities, (2) thiết kế weeklyTemplate gồm đúng ${input.daysPerWeek} buổi — MỖI buổi có "blocks" (thời khoá biểu chi tiết theo phút, tổng ≈ ${sessionMinutes} phút) + "vocabFocus", và chèn block Shadowing/Dictation cho kỹ năng Speaking/Writing nếu yếu. Trả về JSON.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    temperature: 0.5,
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

const SHADOWING_ENRICH_SYSTEM = `You are an English phonetics + Vietnamese translation assistant for an IELTS shadowing app.

You receive a list of English shadowing segments numbered 1..N. For each segment, output:
- ipa: the IPA transcription of the WHOLE segment in standard General American IPA (no slashes — just the IPA characters separated by single spaces between words). Use stress marks ˈ ˌ where natural. Be accurate, not approximate.
- textVi: a natural-sounding Vietnamese translation of the segment that a learner can read alongside the English. Keep it concise; do NOT translate proper nouns. Tone is neutral / explanatory.

Return ONLY valid JSON — no markdown, no commentary — matching this exact TypeScript type:

type EnrichResult = {
  items: { index: number; ipa: string; textVi: string }[];
};

"index" MUST match the 1-based number we gave you. Items MUST appear in ascending index order and cover every segment exactly once.`;

export interface ShadowingEnrichInput {
  segments: { textEn: string }[];
}
export interface ShadowingEnrichItem {
  index: number;
  ipa: string;
  textVi: string;
}

const SHADOWING_FIX_SYSTEM = `You are an English transcription cleaner + phonetics + Vietnamese translation assistant for an IELTS shadowing app.

You receive a list of English shadowing segments numbered 1..N. The English text usually comes from automatic speech recognition (Whisper / Deepgram) so it may have:
- Wrong or missing capitalization (e.g. "i don't" → "I don't").
- Missing or misplaced punctuation (e.g. "Hello world how are you" → "Hello world. How are you?").
- Homophone errors ("there/their/they're", "your/you're", "to/too", "speaker/speak", "principle/principal").
- Concatenated spoken words like "gonna", "wanna" — KEEP these as-is, they are valid spoken English.
- Filler tokens like "uh", "um", "er" — REMOVE these from textEn.

For each segment, output:
- textEn: the cleaned English sentence. Fix capitalization + punctuation + obvious word errors. Do NOT paraphrase or change the meaning. Keep contractions ("don't", "I'm", "you're"). Preserve numbers as written in the input (digit vs word).
- ipa: General American IPA of the CLEANED textEn (no slashes, single space between words, stress marks ˈ ˌ where natural).
- textVi: natural Vietnamese translation of the CLEANED textEn — concise, neutral tone, do NOT translate proper nouns.

Return ONLY valid JSON — no markdown, no commentary — matching this exact TypeScript type:

type FixResult = {
  items: { index: number; textEn: string; ipa: string; textVi: string }[];
};

"index" MUST match the 1-based number we gave you. Items MUST appear in ascending index order and cover every segment exactly once.`;

export interface ShadowingFixItem {
  index: number;
  textEn: string;
  ipa: string;
  textVi: string;
}

/** Like enrichShadowingSegments but ALSO cleans the English text. Use when
 *  the source transcript came from STT and may have capitalization,
 *  punctuation, or homophone errors. The returned textEn replaces the
 *  input textEn; admin reviews before saving. */
export async function fixShadowingSegments(
  input: ShadowingEnrichInput,
): Promise<ShadowingFixItem[]> {
  if (input.segments.length === 0) return [];
  const lines = input.segments
    .map((s, i) => `${i + 1}. ${s.textEn.replace(/\s+/g, " ").trim()}`)
    .join("\n");
  const userMessage = `Here are ${input.segments.length} shadowing segments from automatic speech recognition. Clean each English sentence, then produce IPA + Vietnamese for the cleaned version. Return the JSON:\n\n${lines}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: Math.min(8000, 200 + input.segments.length * 180),
    temperature: 0.2,
    system: SHADOWING_FIX_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = extractJSON(text) as { items?: ShadowingFixItem[] };
  return (parsed.items ?? []).filter(
    (x) => x && typeof x.index === "number" && typeof x.textEn === "string",
  );
}

/** Send a batch of shadowing sentences to Claude and get IPA + Vietnamese back for each. */
export async function enrichShadowingSegments(
  input: ShadowingEnrichInput,
): Promise<ShadowingEnrichItem[]> {
  if (input.segments.length === 0) return [];
  const lines = input.segments
    .map((s, i) => `${i + 1}. ${s.textEn.replace(/\s+/g, " ").trim()}`)
    .join("\n");
  const userMessage = `Here are ${input.segments.length} shadowing segments. Produce IPA + Vietnamese for every one and return the JSON:\n\n${lines}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: Math.min(8000, 200 + input.segments.length * 120),
    temperature: 0.2,
    system: SHADOWING_ENRICH_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = extractJSON(text) as { items?: ShadowingEnrichItem[] };
  return (parsed.items ?? []).filter((x) => x && typeof x.index === "number");
}

export type EstimatedCefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/**
 * Estimate the CEFR difficulty of an English transcript excerpt for the
 * Shadowing / Podcasts difficulty badge. Best-effort: returns null on any
 * error or unparseable output so the caller can just leave the level unset.
 * Cheap — single short completion, max_tokens tiny, temperature 0.
 */
export async function estimateCefrLevel(
  sampleText: string,
): Promise<EstimatedCefr | null> {
  const text = sampleText.replace(/\s+/g, " ").trim().slice(0, 4000);
  if (text.length < 20) return null;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8,
      temperature: 0,
      system:
        "You are a CEFR leveling assistant for an English listening/speaking app. " +
        "Given an English transcript excerpt, reply with ONLY the single CEFR code " +
        "that best matches how hard it is to understand and shadow aloud: A1, A2, " +
        "B1, B2, C1, or C2. Output just the two-character code, nothing else.",
      messages: [{ role: "user", content: text }],
    });
    const out = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .toUpperCase();
    const m = out.match(/A1|A2|B1|B2|C1|C2/);
    return m ? (m[0] as EstimatedCefr) : null;
  } catch (e) {
    console.error(
      "[estimateCefrLevel] failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
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
