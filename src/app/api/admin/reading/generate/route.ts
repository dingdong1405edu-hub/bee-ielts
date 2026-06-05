import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateReadingTest, type ReadingImageInput, type ReadingPdfInput } from "@/lib/claude";

// Claude needs time to read the passage and solve every question.
export const maxDuration = 120;

// 12 MB cap — CamScanner exam exports are usually 1–6 MB; bigger files
// blow request limits and timeouts before Claude even sees the PDF.
const MAX_PDF_BYTES = 12 * 1024 * 1024;

const bodySchema = z.object({
  rawText: z.string().optional(),
  images: z.array(z.string()).max(8).optional(),
  /** Data URL of a PDF file (CamScanner export, scanned exam, etc.). */
  pdfDataUrl: z.string().optional(),
  /** CamScanner / Google Drive share URL — server tries to fetch it as a PDF. */
  camScannerUrl: z.string().url().optional(),
  bank: z.enum(["PRACTICE", "MOCK"]).default("PRACTICE"),
});

/** Shape Claude must return — also what we trust before writing to the DB. */
const resultSchema = z.object({
  title: z.string().trim().min(1),
  passage: z.string().trim().min(50),
  questions: z
    .array(
      z.object({
        type: z.enum(["MCQ", "MATCHING_HEADINGS", "FILL_BLANK", "TRUE_FALSE_NOT_GIVEN"]),
        prompt: z.string().trim().min(1),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().trim().min(1),
        explanation: z.string().optional(),
      }),
    )
    .min(1),
});

/** Split a `data:image/...;base64,...` URL into the parts Claude needs. */
function parseImageDataUrl(dataUrl: string): ReadingImageInput | null {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1] as ReadingImageInput["mediaType"], data: m[2] };
}

/** Pull the base64 payload out of a `data:application/pdf;base64,...` URL. */
function parsePdfDataUrl(dataUrl: string): ReadingPdfInput | null {
  const m = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);
  if (!m) return null;
  return { data: m[1] };
}

/**
 * Try to download a remote URL as a PDF. CamScanner share links are usually
 * gated behind their viewer (they return HTML), but Drive/Dropbox direct
 * download links return the actual PDF — handle whatever we can.
 */
async function fetchPdfFromUrl(url: string): Promise<ReadingPdfInput> {
  const res = await fetch(url, {
    headers: {
      // CamScanner / Drive sometimes 403 a plain SDK fetch — pretend to be a browser.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/pdf,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tải link thất bại (HTTP ${res.status})`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/pdf")) {
    throw new Error(
      "Link không trả về file PDF (thường CamScanner share cần đăng nhập). Hãy tải PDF về máy rồi bấm 'Tải file PDF'.",
    );
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_PDF_BYTES) throw new Error("File PDF quá lớn (>12MB)");
  // ArrayBuffer → base64 (chunk to avoid blowing the call stack on big files).
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return { data: Buffer.from(bin, "binary").toString("base64") };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server chưa cấu hình ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const { rawText, images, pdfDataUrl, camScannerUrl, bank } = parsed.data;

  const imgInputs = (images ?? [])
    .map(parseImageDataUrl)
    .filter((x): x is ReadingImageInput => x !== null);

  // Pick up an uploaded PDF first; fall back to fetching the CamScanner link.
  let pdfInput: ReadingPdfInput | undefined;
  if (pdfDataUrl) {
    const p = parsePdfDataUrl(pdfDataUrl);
    if (!p) return NextResponse.json({ error: "File PDF không hợp lệ" }, { status: 400 });
    // Each base64 char is 6 bits — back to bytes for the size guard.
    const bytes = Math.floor((p.data.length * 3) / 4);
    if (bytes > MAX_PDF_BYTES)
      return NextResponse.json({ error: "File PDF quá lớn (>12MB)" }, { status: 413 });
    pdfInput = p;
  } else if (camScannerUrl) {
    try {
      pdfInput = await fetchPdfFromUrl(camScannerUrl);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Tải link thất bại" },
        { status: 400 },
      );
    }
  }

  if (!rawText?.trim() && imgInputs.length === 0 && !pdfInput) {
    return NextResponse.json(
      { error: "Hãy dán nội dung, tải ảnh/PDF, hoặc dán link CamScanner" },
      { status: 400 },
    );
  }

  let generated;
  try {
    generated = await generateReadingTest({ rawText, images: imgInputs, pdf: pdfInput });
  } catch (e) {
    console.error("generateReadingTest failed:", e);
    return NextResponse.json(
      { error: "AI không phân tích được đề. Kiểm tra lại nội dung hoặc thử lại." },
      { status: 502 },
    );
  }

  const valid = resultSchema.safeParse(generated);
  if (!valid.success) {
    console.error("AI reading output invalid:", valid.error.message);
    return NextResponse.json(
      { error: "AI trả về dữ liệu chưa đúng định dạng. Hãy thử lại." },
      { status: 502 },
    );
  }
  const data = valid.data;

  const test = await prisma.readingTest.create({
    data: {
      title: data.title,
      passage: data.passage,
      bank,
      questions: {
        create: data.questions.map((q, i) => ({
          type: q.type,
          prompt: q.prompt,
          options: q.options && q.options.length > 0 ? q.options : undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: i + 1,
        })),
      },
    },
  });

  return NextResponse.json({ id: test.id });
}
