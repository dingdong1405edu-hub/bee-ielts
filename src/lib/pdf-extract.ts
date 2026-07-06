/**
 * pdf-extract — pull the plain text out of a teacher-uploaded PDF so the AI can
 * read the đề bài and generate the answer key + solutions.
 *
 * Handles BOTH a base64 `data:application/pdf;base64,…` URL (the builder's
 * default storage) and a public https URL. Text-only: pdf-parse extracts the
 * embedded text layer — a scanned/image PDF has none, so callers must handle a
 * near-empty result (we surface a "hãy nhập đáp án thủ công" message upstream).
 */

/** Decode a `data:…;base64,…` URL into a Node Buffer. Returns null if not one. */
function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma === -1) return null;
  const b64 = dataUrl.slice(comma + 1);
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

/**
 * Extract the text content of a PDF given as a data URL or a public URL.
 * Throws on unreadable input; returns "" if the PDF simply has no text layer.
 */
export async function extractPdfText(pdfUrl: string): Promise<string> {
  let buf: Buffer;
  if (pdfUrl.startsWith("data:")) {
    const decoded = dataUrlToBuffer(pdfUrl);
    if (!decoded) throw new Error("PDF data URL không hợp lệ");
    buf = decoded;
  } else {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error(`Không tải được PDF (${res.status})`);
    buf = Buffer.from(await res.arrayBuffer());
  }

  // Import the inner lib (not the index) to avoid pdf-parse's debug self-test.
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = (mod.default ?? mod) as (data: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buf);

  // Strip NUL bytes and collapse the runs of blank lines pdf-parse leaves
  // between columns so the model sees clean, compact text.
  const NUL = new RegExp(String.fromCharCode(0), "g");
  return (data.text ?? "")
    .replace(NUL, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
