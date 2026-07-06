/**
 * POST /api/assignments/generate-key — the teacher uploads only the files; the
 * AI reads them and returns the answer key + detailed solutions (no manual key).
 *
 * Body: { skill: "READING" | "LISTENING", pdfUrl, audioUrl? }
 *   - pdfUrl : the đề-bài PDF as a data URL (or public URL).
 *   - audioUrl : REQUIRED for LISTENING (the answers come from the audio).
 *
 * Flow:
 *   1. Extract the PDF text (pdf-parse). Scanned/image PDFs yield no text → 422
 *      so the UI can fall back to a manual answer key.
 *   2. LISTENING: transcribe the audio (Deepgram → Groq Whisper fallback).
 *   3. Groq reads passage/transcript + questions → { questions[], notes }.
 *
 * Returns the generated questions for the teacher to review before saving; the
 * actual persist happens through POST /api/assignments (custom_questions).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacher } from "@/lib/teacher-auth";
import { extractPdfText } from "@/lib/pdf-extract";
import { generatePaperKeyGroq, generateReadingExamGroq } from "@/lib/groq";
import { deepgramTranscribe } from "@/lib/deepgram";

export const maxDuration = 60;

const bodySchema = z.object({
  skill: z.enum(["READING", "LISTENING"]),
  pdfUrl: z.string().min(1, "Thiếu file PDF"),
  audioUrl: z.string().optional(),
});

/** Decode `data:<mime>;base64,<data>` → { bytes, mime }; null if not a data URL. */
function decodeDataUrl(u: string): { bytes: ArrayBuffer; mime: string } | null {
  const comma = u.indexOf(",");
  if (!u.startsWith("data:") || comma === -1) return null;
  const header = u.slice(5, comma); // e.g. "audio/mpeg;base64"
  const mime = header.split(";")[0] || "application/octet-stream";
  const buf = Buffer.from(u.slice(comma + 1), "base64");
  // Slice to a standalone ArrayBuffer (Buffer shares a pooled backing store).
  const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return { bytes, mime };
}

export async function POST(req: Request) {
  const gate = await requireTeacher();
  if (gate instanceof NextResponse) return gate;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }
  const { skill, pdfUrl, audioUrl } = parsed.data;

  // 1) PDF → text.
  let documentText = "";
  try {
    documentText = await extractPdfText(pdfUrl);
  } catch (e) {
    console.error("[generate-key] pdf extract failed:", e);
    return NextResponse.json(
      { error: "Không đọc được nội dung PDF. Hãy chắc chắn đây là file PDF có chữ." },
      { status: 422 },
    );
  }

  // 2) LISTENING → transcript (answers live in the audio).
  let audioTranscript = "";
  if (skill === "LISTENING") {
    if (!audioUrl || !audioUrl.trim()) {
      return NextResponse.json(
        { error: "Bài Listening cần file nghe để AI tạo đáp án." },
        { status: 400 },
      );
    }
    try {
      let bytes: ArrayBuffer;
      let mime: string;
      if (audioUrl.startsWith("data:")) {
        const d = decodeDataUrl(audioUrl);
        if (!d) throw new Error("audio data URL không hợp lệ");
        bytes = d.bytes;
        mime = d.mime;
      } else {
        const r = await fetch(audioUrl);
        if (!r.ok) throw new Error(`fetch audio ${r.status}`);
        bytes = await r.arrayBuffer();
        mime = r.headers.get("content-type") || "audio/mpeg";
      }
      const tr = await deepgramTranscribe(bytes, mime);
      audioTranscript = tr.transcript.trim();
    } catch (e) {
      console.error("[generate-key] transcribe failed:", e);
      return NextResponse.json(
        { error: "Không nhận dạng được file nghe. Hãy thử lại hoặc nhập đáp án thủ công." },
        { status: 422 },
      );
    }
  }

  // Guard: a text-free (scanned) PDF with no transcript is unreadable.
  const textLen = documentText.replace(/\s+/g, " ").trim().length;
  if (textLen < 120 && !audioTranscript) {
    return NextResponse.json(
      {
        error:
          "PDF gần như không có chữ (có thể là ảnh scan). AI không đọc được — hãy nhập đáp án thủ công.",
        scanned: true,
      },
      { status: 422 },
    );
  }

  // 3) Generate.
  try {
    if (skill === "READING") {
      // READING → a full native-shaped test (passage + questions with full-text
      // options), so the student does it in the same ReadingShell as practice.
      const result = await generateReadingExamGroq({ documentText });
      if (result.questions.length === 0 || !result.passage) {
        return NextResponse.json(
          {
            error:
              "AI chưa đọc được bài đọc hoặc câu hỏi trong đề. Hãy kiểm tra lại file hoặc nhập đáp án thủ công.",
            notes: result.notes,
          },
          { status: 422 },
        );
      }
      return NextResponse.json({
        mode: "reading",
        title: result.title,
        passage: result.passage,
        questions: result.questions,
        figures: result.figures,
        notes: result.notes,
        meta: { pdfChars: documentText.length },
      });
    }

    // LISTENING → unchanged letter-based answer sheet over the PDF + audio.
    const result = await generatePaperKeyGroq({ skill, documentText, audioTranscript });
    if (result.questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "AI chưa tìm thấy câu hỏi nào trong đề. Hãy kiểm tra lại file hoặc nhập đáp án thủ công.",
          notes: result.notes,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({
      mode: "listening",
      questions: result.questions,
      notes: result.notes,
      meta: { pdfChars: documentText.length, transcriptChars: audioTranscript.length },
    });
  } catch (e) {
    console.error("[generate-key] groq failed:", e);
    return NextResponse.json(
      { error: "AI tạo đáp án thất bại. Thử lại sau ít phút hoặc nhập đáp án thủ công." },
      { status: 502 },
    );
  }
}
