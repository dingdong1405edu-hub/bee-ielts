import Anthropic from "@anthropic-ai/sdk";
import {
  READING_EXAM_SYS,
  READING_ONE_PASSAGE_SYS,
  parseReadingExam,
  parseReadingExamParts,
  type ReadingExamMulti,
  type ReadingExamPart,
  type ReadingExamQuestion,
  type ReadingFigure,
} from "@/lib/groq";

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

Design exactly one session per available day. Mỗi buổi có MỘT kỹ năng trọng tâm (điền vào "skill" để gắn nhãn), NHƯNG bạn ĐƯỢC PHÉP linh hoạt: trong cùng một buổi có thể (a) cho học viên làm NHIỀU bài của cùng một kỹ năng (vd 2 passage Reading liên tiếp), hoặc (b) GHÉP 2 kỹ năng trong cùng buổi (vd nửa đầu Listening, nửa sau Writing) khi điều đó hợp lý với điểm yếu/mục tiêu của họ. Hãy quyết định dựa trên dữ liệu + "Yêu cầu" của học viên. Write everything in Vietnamese.

LỊCH GIỜ: Nếu thông tin người học ghi "GIỜ CỐ ĐỊNH" → mọi buổi bắt đầu đúng giờ đó (KHÔNG cần điền "startTime"). Nếu ghi "HỌC VIÊN KHÔNG CỐ ĐỊNH GIỜ — tự sắp xếp" → BẠN hãy TỰ chọn một GIỜ BẮT ĐẦU hợp lý cho TỪNG buổi và điền vào "startTime" ("HH:MM", khung 06:00–22:00). Có thể cho các buổi giờ khác nhau (vd buổi cuối tuần học sáng, buổi trong tuần học tối) cho thực tế.

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
    skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "VOCAB" | "GRAMMAR"; // kỹ năng TRỌNG TÂM của buổi (nhãn buổi)
    title: string;           // tiêu đề ngắn (Vietnamese) nêu trọng tâm buổi
    startTime?: string;      // CHỈ điền khi học viên KHÔNG cố định giờ — giờ bắt đầu buổi này "HH:MM" do bạn tự sắp xếp
    vocabFocus: string;      // chủ đề từ vựng + 5–8 từ/collocation mẫu nên học buổi này (Vietnamese)
    blocks: {                // thời khoá biểu chi tiết — 2–5 block nối tiếp, tổng ≈ số phút mỗi buổi
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
  /** Preferred clock start time "HH:MM" (default 19:00) — the agenda starts here.
   *  Ignored when autoTime is true (the AI picks a start time per session). */
  startTime?: string;
  /** Learner did NOT fix a study time — let the AI assign a sensible clock start
   *  for each session itself (returned as weeklyTemplate[].startTime). */
  autoTime?: boolean;
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
    /** AI-chosen clock start "HH:MM" for this session — only when the learner
     *  did not fix a study time (autoTime). */
    startTime?: string;
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
  const timeLine = input.autoTime
    ? `- HỌC VIÊN KHÔNG CỐ ĐỊNH GIỜ — tự sắp xếp: hãy CHỌN giờ bắt đầu hợp lý cho TỪNG buổi và điền "startTime" ("HH:MM"). Mỗi buổi dài khoảng ${sessionMinutes} phút.`
    : `- GIỜ CỐ ĐỊNH: mỗi buổi dài khoảng ${sessionMinutes} phút, bắt đầu lúc ${startTime} (KHÔNG cần điền "startTime"; thiết kế các block khớp tổng thời lượng này)`;

  const userMessage = `Thông tin người học:
- Mục tiêu: band ${input.targetBand.toFixed(1)}
- ${input.hasExamDate ? `Còn ${input.weeksUntilExam} tuần đến ngày thi` : `Chưa đặt ngày thi — lập kế hoạch ${input.weeksUntilExam} tuần`}
- Học ${input.daysPerWeek} buổi/tuần
${timeLine}

Kết quả luyện tập từng kỹ năng (trung bình):
${perf}${mockBlock}${focusBlock}${vocabBlock}

Hãy: (1) viết "assessment" đánh giá chi tiết đủ 6 kỹ năng + priorities, (2) thiết kế weeklyTemplate gồm đúng ${input.daysPerWeek} buổi — MỖI buổi có "blocks" (thời khoá biểu chi tiết theo phút, tổng ≈ ${sessionMinutes} phút) + "vocabFocus"${input.autoTime ? ` + "startTime" tự sắp xếp` : ""}. Được phép làm nhiều bài trong 1 kỹ năng hoặc ghép 2 kỹ năng trong cùng buổi nếu hợp lý. Chèn block Shadowing/Dictation cho kỹ năng Speaking/Writing nếu yếu. Trả về JSON.`;

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

/**
 * Teacher READING exam generator — Claude reads the uploaded PDF NATIVELY (beta
 * documents API: keeps layout, multi-column passages, tables, and even works on
 * scans) and returns the rich native-reading shape (all question types + table
 * completion + AI-drawn map/plan SVG + Vietnamese explanations). This is the
 * PRIMARY path for /api/assignments/generate-key — Claude's huge context + high
 * limits make it far more reliable than Groq's 12k-tokens/minute free tier.
 */
/** A PDF document content block, cached so the outline + per-passage calls reuse
 *  the same processed PDF (cheaper + faster) within the 5-minute cache window. */
function pdfDocBlock(pdfBase64: string) {
  return {
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
    cache_control: { type: "ephemeral" },
  };
}

function betaText(response: Anthropic.Beta.Messages.BetaMessage): string {
  return response.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function toInt(v: unknown): number {
  return typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
}

interface PassageOutline {
  title: string;
  firstQuestion: number;
  lastQuestion: number;
}
interface OutlineResult {
  passages: PassageOutline[];
  lastQuestion: number;
}

const READING_OUTLINE_SYS = `You are an IELTS Reading test analyst. The attached PDF is a FULL IELTS Reading paper made of SEVERAL separate reading passages, each with its OWN title/heading and its OWN block of numbered questions. Scan the WHOLE paper — EVERY page, first to last. Do NOT stop after the first one or two passages.

HOW MANY PASSAGES:
- A standard Academic paper has 40 questions across EXACTLY 3 passages (~13–14 questions each: e.g. 1–13, 14–26, 27–40). It is NEVER just 2 passages. Some papers have 4.
- Each passage begins with a NEW heading/title (often labelled "Reading Passage 1/2/3", or a big title line) followed by its own body text and its own question block. A new title = a new passage. If you counted fewer passages than the question count implies (e.g. only 2 for a 40-question paper), you MISSED one — look again on the later pages.

Return ONLY JSON:
{
  "passages": [ { "title": "<this passage's own title>", "firstQuestion": <first question number of this passage>, "lastQuestion": <last question number of this passage> } ],
  "lastQuestion": <the number of the VERY LAST question in the whole paper, e.g. 40>
}

Rules:
- One entry per passage, in order. NEVER merge two passages into one entry.
- "firstQuestion" = the first numbered question that belongs to that passage. Ranges are contiguous and cover 1 … "lastQuestion".
- "lastQuestion" = the highest question number ANYWHERE in the paper (usually 40). Do NOT under-count — check the final pages.
- Just the outline — do NOT extract passage text or questions here.`;

const READING_LASTQ_SYS = `You are analysing a FULL IELTS Reading paper (attached PDF). Your ONLY job: find the SINGLE HIGHEST question number in the ENTIRE paper. IELTS Academic papers almost always end at question 40 (occasionally 38–42). The questions run across MANY pages and SEVERAL passages, so the highest number is on the LAST pages — you MUST scan through to the very last page, do not answer from the first pages. Return ONLY JSON: {"lastQuestion": <the highest question number anywhere in the paper>}.`;

/** Focused, highly-reliable read of JUST the last question number. Far more
 *  dependable than trusting the full outline's count — used to catch an outline
 *  that stopped early and never saw the final passage's questions. */
async function findLastQuestion(docBlock: unknown): Promise<number> {
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 200,
      temperature: 0,
      system: READING_LASTQ_SYS,
      messages: [
        {
          role: "user",
          content: [
            docBlock,
            { type: "text", text: 'Scan to the LAST page. What is the highest question number in the whole paper? Return ONLY {"lastQuestion": N}.' },
          ] as unknown as Anthropic.Beta.Messages.BetaContentBlockParam[],
        },
      ],
      betas: ["pdfs-2024-09-25"],
    });
    const parsed = extractJSON(betaText(response)) as { lastQuestion?: unknown };
    const n = toInt(parsed.lastQuestion);
    // IELTS Reading tops out at 40 (rarely a couple more). Anything wildly bigger
    // is a misread — ignore it so we don't synthesise dozens of junk parts.
    return Number.isFinite(n) && n > 0 && n <= 50 ? n : 0;
  } catch (e) {
    console.error("[findLastQuestion] failed:", e);
    return 0;
  }
}

/** Phase 1: list the passages (title + first question) + the paper's last
 *  question number. A tiny, reliable task — far more dependable than asking one
 *  call to extract the whole paper. `hintLast`, when given, is the independently
 *  confirmed last question number: we force the outline to cover through it so it
 *  can't stop after the first two passages. */
async function outlineReadingPassages(docBlock: unknown, hintLast?: number): Promise<OutlineResult> {
  const hint =
    hintLast && hintLast > 0
      ? ` IMPORTANT: this paper's questions run all the way to question ${hintLast}. You MUST list every passage through question ${hintLast}. If your passage list stops before ${hintLast}, you MISSED the passage(s) on the later pages — look again at those pages and include them (there is almost certainly a passage covering the final questions up to ${hintLast}).`
      : "";
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 1500,
    temperature: 0,
    system: READING_OUTLINE_SYS,
    messages: [
      {
        role: "user",
        content: [
          docBlock,
          { type: "text", text: `List EVERY reading passage with its title + first question number, and the paper's LAST question number. Return ONLY the JSON.${hint}` },
        ] as unknown as Anthropic.Beta.Messages.BetaContentBlockParam[],
      },
    ],
    betas: ["pdfs-2024-09-25"],
  });
  const parsed = extractJSON(betaText(response)) as { passages?: unknown; lastQuestion?: unknown };
  const raw = Array.isArray(parsed.passages) ? parsed.passages : [];
  const passages = raw
    .map((p): PassageOutline => {
      const o = (p ?? {}) as Record<string, unknown>;
      return { title: String(o.title ?? "").trim(), firstQuestion: toInt(o.firstQuestion), lastQuestion: toInt(o.lastQuestion) };
    })
    .filter((o) => Number.isFinite(o.firstQuestion));
  return { passages, lastQuestion: toInt(parsed.lastQuestion) };
}

/** Make the ranges contiguous + covering the whole paper: a passage's lastQuestion
 *  is the next passage's firstQuestion − 1, and the FINAL passage runs to the
 *  paper's last question. This fixes an outline that under-reports a passage's
 *  range (e.g. "27–27" for a passage that actually owns 27–40). */
function normalizeOutline(res: OutlineResult): PassageOutline[] {
  const ps = res.passages.filter((p) => Number.isFinite(p.firstQuestion)).sort((a, b) => a.firstQuestion - b.firstQuestion);
  if (ps.length === 0) return [];
  const overallLast = Math.max(
    Number.isFinite(res.lastQuestion) ? res.lastQuestion : 0,
    ...ps.map((p) => (Number.isFinite(p.lastQuestion) ? p.lastQuestion : 0)),
    ps[ps.length - 1].firstQuestion,
  );
  return ps.map((p, i) => {
    const firstQuestion = p.firstQuestion;
    let lastQuestion = i < ps.length - 1 ? ps[i + 1].firstQuestion - 1 : overallLast;
    if (!Number.isFinite(lastQuestion) || lastQuestion < firstQuestion) {
      lastQuestion = Number.isFinite(p.lastQuestion) && p.lastQuestion >= firstQuestion ? p.lastQuestion : firstQuestion;
    }
    return { title: p.title, firstQuestion, lastQuestion };
  });
}

/** UNION two outlines by passage start, so a re-outline can only ADD passages it
 *  found (typically the missed tail) — never DROP one the first pass already had.
 *  Starts within 3 of each other are the same boundary (IELTS passages are ≥10
 *  apart); we keep one, preferring the entry that carries a title. */
function mergeOutlines(a: OutlineResult, b: OutlineResult): OutlineResult {
  const all = [...a.passages, ...b.passages]
    .filter((p) => Number.isFinite(p.firstQuestion))
    .sort((x, y) => x.firstQuestion - y.firstQuestion);
  const merged: PassageOutline[] = [];
  for (const p of all) {
    const near = merged.find((m) => Math.abs(m.firstQuestion - p.firstQuestion) <= 3);
    if (near) {
      if (!near.title && p.title) near.title = p.title;
      if (Number.isFinite(p.lastQuestion) && p.lastQuestion > (near.lastQuestion || 0)) near.lastQuestion = p.lastQuestion;
      continue;
    }
    merged.push({ ...p });
  }
  return { passages: merged, lastQuestion: Math.max(a.lastQuestion || 0, b.lastQuestion || 0) };
}

/** Typical questions-per-passage for THIS paper, inferred from the gaps between
 *  the passage starts the outline already found (≈13 for a 3-passage paper, ≈10
 *  for a 4-passage one). Used to place synthesised tail passages on real
 *  boundaries. Falls back to 13 when there's too little signal. */
function medianGap(firsts: number[]): number {
  const sorted = [...firsts].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  if (gaps.length === 0) return 13;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const m = gaps.length % 2 ? gaps[mid] : Math.round((gaps[mid - 1] + gaps[mid]) / 2);
  return m >= 6 ? m : 13; // guard against tiny/garbage gaps over-splitting the tail
}

/** Normalise a passage title for comparison: drop "Reading Passage N" wrappers +
 *  punctuation, lowercase. */
function titleKey(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/reading\s+passage\s*\d+/g, " ")
    .replace(/passage\s*\d+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
/** English function words that carry no title identity — excluded so two titles
 *  can't score a spurious match on shared "the/and/for…". */
const TITLE_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for", "from",
  "with", "by", "as", "is", "are", "was", "were", "be", "been", "its", "it",
  "this", "that", "these", "those", "into", "over", "under", "between", "their",
  "our", "your", "more", "most", "some", "all", "not", "but", "than", "then",
  "new", "one", "two", "about", "can", "will", "how", "why", "who", "what",
  "when", "where",
]);
/** Content words of a title (stopwords + 1-char tokens removed). */
function titleWords(s: string): Set<string> {
  return new Set(titleKey(s).split(" ").filter((w) => w.length >= 2 && !TITLE_STOPWORDS.has(w)));
}
/** Overlap coefficient of the two titles' content words (0..1). Robust to short
 *  titles and to one title being a substring of the other. */
function titleSim(a: string, b: string): number {
  const wa = titleWords(a);
  const wb = titleWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}
/** Which outline passage does `title` belong to? Returns that index, or -1 when
 *  there's no clear single winner (weak match or an ambiguous tie) — so callers
 *  fall back to number-collision reasoning instead of a coin-flip. */
function bestTitleMatch(title: string, outline: PassageOutline[]): number {
  let best = -1;
  let bestScore = 0;
  let tie = false;
  outline.forEach((o, i) => {
    const s = titleSim(title, o.title);
    if (s > bestScore) {
      bestScore = s;
      best = i;
      tie = false;
    } else if (s === bestScore && s > 0) {
      tie = true;
    }
  });
  return bestScore >= 0.5 && !tie ? best : -1;
}

/** Assign a raw extracted passage `r` to outline[idx]'s question range, returning
 *  the questions + figures that belong to THIS part. This is the delicate bit — a
 *  call/whole-paper part can (a) return exactly this passage's questions, (b) leak
 *  a neighbour's, or (c) return the RIGHT passage but with restarted numbering
 *  (e.g. 1–14 for a passage that owns 27–40). We must NEVER silently put another
 *  passage's content here (that mis-grades students with no warning):
 *   - keep questions whose number is already in THIS range (trims leaks);
 *   - if the numbers don't line up, use the passage TITLE to tell a genuine
 *     restart of THIS passage (→ renumber onto the range) from a leaked wrong
 *     passage (→ reject). Title beats number-collision: a restarted Part 3 numbered
 *     1–14 "collides" with Part 1's range yet is clearly Part 3 by its title.
 *   - with no title signal, fall back to the old rule (renumber only if the
 *     numbers don't fall in any OTHER passage's range).
 *   - otherwise keep just the in-range set (possibly empty) → surfaced to the
 *     teacher / filled by the whole-paper pass, never mis-assigned. */
function assignToRange(
  r: ReadingExamPart,
  outline: PassageOutline[],
  idx: number,
): { questions: ReadingExamQuestion[]; figures: ReadingFigure[] } {
  const o = outline[idx];
  const expected = Math.max(1, o.lastQuestion - o.firstQuestion + 1);
  const titleIdx = bestTitleMatch(r.title, outline); // -1 | matching outline index

  // (1) LEAK BY TITLE — the content clearly names a DIFFERENT passage. Trust
  // NOTHING from it, not even numbers that happen to fall in our range (a wrong
  // passage restarted to 1 fully covers Part 1's 1-based range). Surface this
  // part empty (teacher is warned / whole-paper fill retries) rather than
  // silently mis-assign another passage's questions here.
  if (titleIdx !== -1 && titleIdx !== idx) return { questions: [], figures: [] };

  const inRange = r.questions.filter((q) => q.number >= o.firstQuestion && q.number <= o.lastQuestion);
  const inRangeFigs = r.figures.filter((f) => f.atNumber >= o.firstQuestion && f.atNumber <= o.lastQuestion);

  // (2) GENUINE RESTART of THIS passage. A restart re-bases the paper's numbering
  // back to 1, so a genuine one satisfies ALL of:
  //   - inRange empty            → it holds NONE of this passage's own numbers;
  //   - titleIdx === idx         → its TITLE anchors to THIS passage (the decisive
  //                                guard: a spurious/absent title match can never
  //                                on its own trigger a renumber);
  //   - min === paper's first #  → it is numbered from the very start of the paper;
  //   - max <  this range start  → the whole block sits BELOW this passage's range,
  //                                i.e. a low re-based block — NOT a later or foreign
  //                                passage that kept its own numbers (14–26), and NOT
  //                                an outline-missed passage numbered beyond the paper.
  // Only then do we renumber by position. Anything else (foreign passage that kept
  // its numbers, out-of-universe numbers from an under-counted outline, a partial
  // leak that already holds in-range questions) fails a guard and falls through to
  // the safe in-range-only default, so a neighbour's questions can never be
  // relabelled into this part. (A genuine restart that also retained a stray
  // in-range number keeps only that stray here and is topped up by the whole-paper
  // safety net — a short part is surfaced, never a silent mis-grade.)
  const nums = r.questions.map((q) => q.number);
  const isRestart =
    inRange.length === 0 &&
    r.questions.length >= 2 &&
    titleIdx === idx &&
    Math.min(...nums) === outline[0].firstQuestion &&
    Math.max(...nums) < o.firstQuestion;
  if (isRestart) {
    const slice = r.questions.slice(0, expected);
    const remap = new Map<number, number>();
    const questions = slice.map((q, i) => {
      remap.set(q.number, o.firstQuestion + i);
      return { ...q, number: o.firstQuestion + i };
    });
    const figures = r.figures
      .filter((f) => remap.has(f.atNumber))
      .map((f) => ({ ...f, atNumber: remap.get(f.atNumber)! }));
    return { questions, figures };
  }

  // (3) DEFAULT — keep only questions whose ORIGINAL number is in this range
  // (drops strays/leaks). Never relabels a neighbour's question into this part.
  return { questions: inRange, figures: inRangeFigs };
}

/** ONE extraction attempt for a passage. The call gets the whole paper's outline
 *  so it knows the boundaries; `assignToRange` handles putting the result into
 *  this part safely (restart vs leak). */
async function extractOnePassage(
  docBlock: unknown,
  outline: PassageOutline[],
  idx: number,
  outlineText: string,
): Promise<ReadingExamPart> {
  const o = outline[idx];
  const expected = Math.max(1, o.lastQuestion - o.firstQuestion + 1);
  const label = o.title
    ? `"${o.title}"`
    : `the passage whose questions are numbered ${o.firstQuestion}–${o.lastQuestion}`;
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    temperature: 0.2,
    system: READING_ONE_PASSAGE_SYS,
    messages: [
      {
        role: "user",
        content: [
          docBlock,
          {
            type: "text",
            text: `This IELTS Reading paper has ${outline.length} passages:
${outlineText}

Extract ONLY passage ${idx + 1} — ${label} — and ONLY its questions ${o.firstQuestion}–${o.lastQuestion} (that is ${expected} questions). Do NOT include a single question that belongs to another passage (those are extracted separately). Copy THIS passage's full text verbatim (join hard-wrapped lines into flowing paragraphs). You MUST produce EVERY question from ${o.firstQuestion} to ${o.lastQuestion} with the paper's ORIGINAL numbers — do not stop early, do not skip any. If a question is a TABLE or MAP/PLAN, use the TABLE/MAP block. Return ONLY the JSON.`,
          },
        ] as unknown as Anthropic.Beta.Messages.BetaContentBlockParam[],
      },
    ],
    betas: ["pdfs-2024-09-25"],
  });
  const r = parseReadingExam(extractJSON(betaText(response)) as Record<string, unknown>);
  const { questions, figures } = assignToRange(r, outline, idx);
  return { title: r.title || o.title, passage: r.passage, questions, figures };
}

/** Extract a passage, RETRYING up to 3× and keeping the attempt with the most
 *  questions — so an under-producing call (1 of 14 questions) gets corrected
 *  instead of shipping a near-empty part. Stops as soon as a call returns the
 *  expected count. */
async function extractPassageBest(
  docBlock: unknown,
  outline: PassageOutline[],
  idx: number,
  outlineText: string,
): Promise<ReadingExamPart> {
  const o = outline[idx];
  const expected = Math.max(1, o.lastQuestion - o.firstQuestion + 1);
  let best: ReadingExamPart = { title: o.title, passage: "", questions: [], figures: [] };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await extractOnePassage(docBlock, outline, idx, outlineText);
      if (r.questions.length > best.questions.length) best = r;
      else if (r.passage && !best.passage) best = { ...best, passage: r.passage };
    } catch (e) {
      console.error(`[extractPassageBest] "${o.title}" attempt ${attempt} failed:`, e);
    }
    if (best.questions.length >= expected) break;
  }
  return best;
}

/** Legacy one-shot fallback (whole paper in a single call) — used only if the
 *  outline step yields nothing. */
async function singleCallReadingExam(docBlock: unknown): Promise<ReadingExamMulti> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    temperature: 0.2,
    system: READING_EXAM_SYS,
    messages: [
      {
        role: "user",
        content: [
          docBlock,
          {
            type: "text",
            text: "The IELTS Reading exam is in the attached PDF. Split it into one \"part\" per passage (never merge passages or their titles), copy each passage verbatim but JOIN hard-wrapped lines into flowing paragraphs, and build EVERY question. Return ONLY the JSON.",
          },
        ] as unknown as Anthropic.Beta.Messages.BetaContentBlockParam[],
      },
    ],
    betas: ["pdfs-2024-09-25"],
  });
  return parseReadingExamParts(extractJSON(betaText(response)) as Record<string, unknown>);
}

/** A full IELTS Academic Reading paper is essentially always ~40 questions; a
 *  final total this far below is treated as a likely missed passage. */
const IELTS_FLOOR = 38;

export async function generateReadingExamFromPdf(pdfBase64: string): Promise<ReadingExamMulti> {
  const docBlock = pdfDocBlock(pdfBase64);

  // Phase 1: outline the passages (cheap + reliable) — this also warms the PDF
  // prompt cache so the per-passage calls below are fast + cheap. We run the
  // outline AND an independent focused read of the LAST question number in
  // parallel; the latter catches the common failure where the outline stops
  // after the first two passages and never reports the final passage's questions
  // (the exact "only 26 of 40" bug).
  let outlineRes: OutlineResult;
  let trueLast = 0;
  try {
    [outlineRes, trueLast] = await Promise.all([outlineReadingPassages(docBlock), findLastQuestion(docBlock)]);
  } catch (e) {
    console.error("[generateReadingExamFromPdf] outline failed:", e);
    return singleCallReadingExam(docBlock);
  }

  // How far up the question numbers does the outline actually reach?
  const passageReach = (r: OutlineResult) =>
    r.passages.reduce((m, p) => Math.max(m, p.lastQuestion || 0, p.firstQuestion || 0), 0);
  const reach = (r: OutlineResult) => Math.max(passageReach(r), r.lastQuestion || 0);

  // The outline under-counted: its passages don't reach the paper's real last
  // question. Force a re-outline with that number as a hard target and MERGE the
  // two (union) so the retry can only ADD passages — a retry that finds the tail
  // but drops a middle passage can never wipe out the good first result.
  if (trueLast > 0 && trueLast > reach(outlineRes) + 1) {
    try {
      const retry = await outlineReadingPassages(docBlock, trueLast);
      if (retry.passages.length > 0) outlineRes = mergeOutlines(outlineRes, retry);
    } catch (e) {
      console.error("[generateReadingExamFromPdf] outline retry failed:", e);
    }
  }
  if (trueLast > (outlineRes.lastQuestion || 0)) outlineRes.lastQuestion = trueLast;

  // Still short after the retry: the model won't enumerate the tail passage(s).
  // SYNTHESISE outline entries for the missing tail so Phase 2 still attempts
  // questions the outline never listed — the per-passage extraction reads the PDF
  // and fills in the real title/text. Step by THIS paper's own passage size
  // (median gap between found starts: ≈13 for 3-passage, ≈10 for 4-passage) so
  // the synthesised boundaries land on the real passage edges.
  if (trueLast > 0 && trueLast > passageReach(outlineRes) + 1 && outlineRes.passages.length > 0) {
    const firsts = outlineRes.passages.map((p) => p.firstQuestion).filter((n) => Number.isFinite(n));
    const lastFirst = Math.max(...firsts);
    const step = medianGap(firsts);
    // `lastQuestion: trueLast` on each entry is fixed up by normalizeOutline (a
    // passage's last = next passage's first − 1); the `− 3` guard avoids spawning
    // a tiny 1–2 question tail part.
    for (let from = lastFirst + step; from <= trueLast - 3; from += step) {
      outlineRes.passages.push({ title: "", firstQuestion: from, lastQuestion: trueLast });
    }
  }

  const outline = normalizeOutline(outlineRes);
  if (outline.length === 0) return singleCallReadingExam(docBlock);
  const expectedOf = (o: PassageOutline) => Math.max(1, o.lastQuestion - o.firstQuestion + 1);
  const expectedTotal = outline.reduce((n, o) => n + expectedOf(o), 0);

  // A shared map of the whole paper so every extraction knows the exact
  // boundaries and never bleeds a neighbouring passage's questions into itself.
  const outlineText = outline
    .map((o, i) => `${i + 1}. ${o.title ? `"${o.title}"` : "(untitled — read its heading from the PDF)"} — questions ${o.firstQuestion}–${o.lastQuestion}`)
    .join("\n");

  // Phase 2: extract each passage on its own, retrying until it yields its full
  // question count — so no passage ships near-empty.
  const parts = await Promise.all(
    outline.map((_o, i) => extractPassageBest(docBlock, outline, i, outlineText)),
  );

  // If NOTHING came back at all, fall back to the one-shot path.
  if (parts.every((p) => p.passage.length === 0 && p.questions.length === 0)) {
    return singleCallReadingExam(docBlock);
  }

  // SAFETY NET: if any passage is still empty or short after the per-passage
  // retries, read the WHOLE paper in ONE call (it sees every passage at once, so
  // it numbers them consistently) and use it to FILL only the gaps. We try EVERY
  // whole-paper passage as a candidate for the gap and keep the one that yields
  // the most in-range questions — running each through the SAME `assignToRange`,
  // which rejects any candidate that isn't genuinely this passage, so trying them
  // all is safe (a wrong passage can never be injected). A per-passage call that
  // keeps failing (a title it can't anchor, one page it won't read) often
  // succeeds in the holistic pass, so Part 3 stops shipping empty.
  const isShort = (i: number) => parts[i].questions.length < expectedOf(outline[i]);
  if (outline.some((_o, i) => isShort(i))) {
    try {
      const whole = await singleCallReadingExam(docBlock);
      outline.forEach((o, i) => {
        if (!isShort(i)) return;
        let best = { questions: parts[i].questions, figures: parts[i].figures, passage: parts[i].passage, title: parts[i].title };
        for (const wp of whole.parts) {
          const { questions, figures } = assignToRange(wp, outline, i);
          if (questions.length > best.questions.length) {
            best = {
              questions,
              figures,
              passage: parts[i].passage || wp.passage,
              title: parts[i].title || wp.title || o.title,
            };
          }
        }
        if (best.questions.length > parts[i].questions.length) {
          parts[i] = { title: best.title, passage: best.passage, questions: best.questions, figures: best.figures };
        }
      });
    } catch (e) {
      console.error("[generateReadingExamFromPdf] whole-paper fill failed:", e);
    }
  }

  // KEEP every outline passage as a part (even one that produced nothing) so the
  // Part count/structure is preserved and an empty part is SURFACED to the
  // teacher (builder shows "⚠ chưa có câu hỏi" + blocks the save) rather than a
  // whole passage silently vanishing and shifting the Part numbers.
  const produced = parts.reduce((n, p) => n + p.questions.length, 0);
  const missing = Math.max(0, expectedTotal - produced);
  const emptyParts = parts.filter((p) => p.questions.length === 0).length;
  let notes = "";
  if (emptyParts > 0) {
    notes = `Có ${emptyParts} bài đọc AI chưa lấy được câu hỏi — hãy bấm "Tạo lại" hoặc kiểm tra lại file.`;
  } else if (missing > 0) {
    notes = `AI mới tạo ${produced}/${expectedTotal} câu — còn ${missing} câu chưa lấy được. Hãy bấm "Tạo lại" hoặc kiểm tra lại file.`;
  } else if (produced < IELTS_FLOOR && trueLast <= 0) {
    // Absolute floor: `missing` is measured against expectedTotal, which is
    // derived from the SAME outline — so a silent undercount (outline stops at
    // 26, findLastQuestion also failed → trueLast=0) makes them agree at 26 and
    // slips through. A full IELTS Academic Reading is essentially always ~40, so
    // a result this far under, with no reliable last-question read to trust,
    // means the final passage was likely missed — surface it.
    notes = `AI mới lấy ${produced} câu — IELTS Reading thường có 40 câu, có thể còn sót bài đọc/câu hỏi cuối. Hãy kiểm tra lại file hoặc bấm "Tạo lại".`;
  }
  return { parts, notes };
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

/** One skill's detailed diagnosis in the post-mock examiner report. */
export interface MockFeedbackSkill {
  skill: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  band: number;
  /** Specific mistakes / weaknesses found, grounded in the real evidence. */
  errors: string[];
  /** Concrete, do-it-now improvement steps for those mistakes. */
  howToImprove: string[];
}

/** Per-mock examiner report shown to the learner after a full mock test. */
export interface MockFeedback {
  overall: string;
  skills: MockFeedbackSkill[];
  /** Cross-skill action plan, ordered by impact on the overall band. */
  priorities: string[];
  encouragement: string;
}

export interface MockFeedbackInput {
  overallBand: number;
  targetBand: number;
  listening: {
    band: number;
    correct: number;
    total: number;
    /** Question types the learner got wrong, worst first. */
    weakTypes: { label: string; wrong: number; total: number }[];
  };
  reading: {
    band: number;
    correct: number;
    total: number;
    weakTypes: { label: string; wrong: number; total: number }[];
  };
  writing: {
    band: number;
    criteria: { name: string; band: number; feedback: string }[];
    /** Concrete in-essay mistakes from the grader (excerpt → correction). */
    annotations: { category?: string; excerpt?: string; issue: string; correction?: string }[];
    summary: string;
    /** Set when there's NO real evidence (essay too short / grading failed) —
     *  the model must explain the reason instead of inventing errors. */
    noGradeReason?: string;
  };
  speaking: {
    band: number;
    criteria: { name: string; band: number; feedback: string }[];
    corrections: { original: string; corrected: string; explanation: string }[];
    observations: string[];
    summary: string;
    /** As writing.noGradeReason — empty transcript / grading failure. */
    noGradeReason?: string;
  };
}

const MOCK_FEEDBACK_SYSTEM = `Bạn là giám khảo IELTS giàu kinh nghiệm, viết một BÁO CÁO CHI TIẾT (tiếng Việt) cho học viên ngay sau khi họ làm xong bài thi thử ĐỦ 4 kỹ năng.

Trọng tâm KHÔNG phải lời khen — mà là CHỈ RÕ LỖI CỤ THỂ và CÁCH SỬA. Với MỖI kỹ năng:
- "errors": liệt kê các lỗi/điểm yếu CỤ THỂ, BÁM SÁT BẰNG CHỨNG được cung cấp (loại câu sai nhiều ở Listening/Reading; tiêu chí thấp + lỗi lặp ở Writing/Speaking; trích lỗi thật khi có, vd "I has → I have"). TUYỆT ĐỐI không bịa lỗi không có trong bằng chứng. Nếu kỹ năng đã tốt và gần như không có lỗi, ghi 1 ý ngắn nói rõ điều đó.
- "howToImprove": cách cải thiện CỤ THỂ, làm được ngay và đo lường được — nêu rõ LÀM GÌ + LÀM THẾ NÀO (bài tập/mẹo/số lượng). Gợi ý mục luyện phù hợp trong app khi hợp lý: Reading/Listening practice, Writing/Speaking practice, Shadowing (/shadowing) cho phát âm & độ trôi chảy, Dictation (/shadowing?mode=dictation) cho nghe + chính tả.

Quy tắc:
- Mọi text bằng tiếng Việt; ví dụ/từ tiếng Anh giữ nguyên.
- Cụ thể, đo lường được — cấm sáo rỗng kiểu "cần luyện thêm".
- Nếu một kỹ năng ghi "CHƯA CÓ BẰNG CHỨNG" (bài quá ngắn / chưa nộp / chấm lỗi): TUYỆT ĐỐI KHÔNG bịa lỗi — "errors" chỉ nêu đúng lý do đó (vd "Bài Writing Task 2 quá ngắn nên chưa chấm được"); "howToImprove" nêu 1-2 bước chung (làm lại nghiêm túc, nộp đủ độ dài bài, đảm bảo micro/ghi âm rõ).
- Mỗi kỹ năng: TỐI ĐA 4 "errors" và 3 "howToImprove" — chọn cái quan trọng nhất.
- "priorities": 3-5 việc ưu tiên trên TOÀN BÀI, xếp theo mức tác động lên overall band (kỹ năng yếu nhất + khoảng cách tới mục tiêu trước).
- "encouragement": 1 câu động viên ngắn (được phép có, nhưng đừng dài).
- CHỈ IN JSON THUẦN — KHÔNG bọc trong \`\`\`json, KHÔNG thêm bất kỳ chữ nào ngoài JSON.

Trả về DUY NHẤT JSON đúng schema:
{
  "overall": "<2-4 câu: band hiện tại so với mục tiêu + 1-2 vấn đề lớn nhất đang kéo điểm>",
  "skills": [
    {
      "skill": "LISTENING" | "READING" | "WRITING" | "SPEAKING",
      "errors": ["<lỗi/điểm yếu cụ thể, bám bằng chứng>"],
      "howToImprove": ["<cách sửa cụ thể, làm được ngay>"]
    }
  ],            // PHẢI đủ 4 kỹ năng, đúng thứ tự Listening, Reading, Writing, Speaking
  "priorities": ["<3-5 việc ưu tiên toàn bài, xếp theo tác động>"],
  "encouragement": "<1 câu động viên ngắn>"
}`;

function fmtWeakTypes(weak: { label: string; wrong: number; total: number }[]): string {
  if (weak.length === 0) return "không sai dạng nào đáng kể";
  return weak.map((w) => `${w.label} sai ${w.wrong}/${w.total}`).join("; ");
}

/**
 * Generate a DETAILED examiner's report after a full mock test — grounded in
 * the real per-type errors (Listening/Reading), essay annotations (Writing)
 * and spoken corrections (Speaking). Best-effort: returns null on any error so
 * the mock-complete flow never fails because of it. The real per-skill bands
 * are stamped onto the result (not trusted from the model).
 */
export async function generateMockFeedback(input: MockFeedbackInput): Promise<MockFeedback | null> {
  try {
    const w = input.writing;
    const s = input.speaking;

    const writingCrit = w.criteria.map((c) => `  · ${c.name}: band ${c.band} — ${c.feedback}`).join("\n") || "  (không có)";
    const writingErrs =
      w.annotations
        .slice(0, 8)
        .map((a) => {
          const pair = a.excerpt && a.correction ? `"${a.excerpt}" → "${a.correction}"` : a.correction ? `→ "${a.correction}"` : "";
          return `  · [${a.category ?? "lỗi"}] ${a.issue}${pair ? ` ${pair}` : ""}`;
        })
        .join("\n") || "  (grader không nêu lỗi cụ thể)";
    const writingBlock = w.noGradeReason
      ? `  CHƯA CÓ BẰNG CHỨNG để phân tích (lý do: ${w.noGradeReason}). KHÔNG bịa lỗi.`
      : `  Tiêu chí:\n${writingCrit}\n  Lỗi cụ thể trong bài (từ grader):\n${writingErrs}\n  Tóm tắt chấm: ${w.summary.slice(0, 500)}`;

    const speakingCrit = s.criteria.map((c) => `  · ${c.name}: band ${c.band} — ${c.feedback}`).join("\n") || "  (không có)";
    const speakingErrs =
      s.corrections.slice(0, 6).map((c) => `  · "${c.original}" → "${c.corrected}" (${c.explanation})`).join("\n") || "  (không có lỗi trích dẫn)";
    const speakingObs = s.observations.slice(0, 4).map((o) => `  · ${o}`).join("\n");
    const speakingBlock = s.noGradeReason
      ? `  CHƯA CÓ BẰNG CHỨNG để phân tích (lý do: ${s.noGradeReason}). KHÔNG bịa lỗi.`
      : `  Tiêu chí:\n${speakingCrit}\n  Lỗi nói cụ thể (từ grader):\n${speakingErrs}${speakingObs ? `\n  Quan sát:\n${speakingObs}` : ""}\n  Tóm tắt chấm: ${s.summary.slice(0, 500)}`;

    const userMessage = `Kết quả thi thử của học viên:
- Overall band: ${input.overallBand.toFixed(1)} · Mục tiêu: band ${input.targetBand.toFixed(1)}

[LISTENING] band ${input.listening.band.toFixed(1)} (${input.listening.correct}/${input.listening.total} đúng)
  Sai theo dạng câu: ${fmtWeakTypes(input.listening.weakTypes)}

[READING] band ${input.reading.band.toFixed(1)} (${input.reading.correct}/${input.reading.total} đúng)
  Sai theo dạng câu: ${fmtWeakTypes(input.reading.weakTypes)}

[WRITING] band ${w.band.toFixed(1)}
${writingBlock}

[SPEAKING] band ${s.band.toFixed(1)}
${speakingBlock}

Viết BÁO CÁO CHI TIẾT theo schema JSON: mỗi kỹ năng có "errors" (BÁM bằng chứng trên — không bịa) và "howToImprove" (cách sửa cụ thể).`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4500,
      temperature: 0.4,
      system: MOCK_FEEDBACK_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });
    if (response.stop_reason === "max_tokens") {
      console.warn("[generateMockFeedback] response hit max_tokens — report may be truncated.");
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = extractJSON(text) as Partial<MockFeedback>;
    if (!parsed || typeof parsed.overall !== "string" || !Array.isArray(parsed.skills)) return null;

    // Normalise: guarantee all 4 skills present, in order, with the REAL band
    // stamped from our data (never trust the model's band).
    const bandBySkill: Record<MockFeedbackSkill["skill"], number> = {
      LISTENING: input.listening.band,
      READING: input.reading.band,
      WRITING: w.band,
      SPEAKING: s.band,
    };
    const order: MockFeedbackSkill["skill"][] = ["LISTENING", "READING", "WRITING", "SPEAKING"];
    const fromAi = new Map<string, Partial<MockFeedbackSkill>>();
    for (const sk of parsed.skills as Partial<MockFeedbackSkill>[]) {
      if (sk && typeof sk.skill === "string") fromAi.set(sk.skill.toUpperCase(), sk);
    }
    const skills: MockFeedbackSkill[] = order.map((skill) => {
      const a = fromAi.get(skill);
      return {
        skill,
        band: bandBySkill[skill],
        errors: Array.isArray(a?.errors) ? a!.errors!.filter((x): x is string => typeof x === "string") : [],
        howToImprove: Array.isArray(a?.howToImprove)
          ? a!.howToImprove!.filter((x): x is string => typeof x === "string")
          : [],
      };
    });

    return {
      overall: parsed.overall,
      skills,
      priorities: Array.isArray(parsed.priorities)
        ? parsed.priorities.filter((x): x is string => typeof x === "string")
        : [],
      encouragement: typeof parsed.encouragement === "string" ? parsed.encouragement : "",
    };
  } catch (e) {
    console.error("[generateMockFeedback] failed:", e instanceof Error ? e.message : e);
    return null;
  }
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
