/**
 * doc-extract — trích chữ từ đề bài giáo viên tải lên, cho CẢ PDF và .docx.
 *
 * Vì sao tách riêng: `extractPdfText` chỉ đọc lớp text của PDF. File Word (.docx)
 * là một gói ZIP chứa XML, cần `mammoth` để lấy chữ. Điểm cộng đáng kể của .docx
 * là BẢNG được trích ra thành chữ thật (mỗi ô là một đoạn) — trong khi bảng in
 * dạng ẢNH trong PDF thì lớp text không có gì, nên phải nhờ Claude đọc ảnh.
 *
 * Cả hai nhánh trả về chuỗi đã dọn: giữ xuống dòng (bộ tách part dựa vào vị trí
 * dòng "Questions X–Y"), nhưng gom bớt dòng trắng thừa.
 */
import { extractPdfText } from "@/lib/pdf-extract";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocKind = "pdf" | "docx";

/** Đoán loại file từ data-URL (mime) hoặc đuôi của URL công khai. null = không rõ. */
export function detectDocKind(url: string): DocKind | null {
  const u = url.trim();
  if (u.startsWith("data:")) {
    const comma = u.indexOf(",");
    const header = (comma === -1 ? u : u.slice(0, comma)).toLowerCase();
    if (header.includes("application/pdf")) return "pdf";
    // Một số trình duyệt gửi mime rút gọn → bắt cả "wordprocessingml".
    if (header.includes(DOCX_MIME) || header.includes("wordprocessingml")) return "docx";
    return null;
  }
  const path = u.split("?")[0].toLowerCase();
  if (path.endsWith(".pdf")) return "pdf";
  if (path.endsWith(".docx")) return "docx";
  return null;
}

/** Nạp data-URL hoặc URL công khai về Buffer. */
async function loadBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    if (comma === -1) throw new Error("Data URL không hợp lệ");
    return Buffer.from(url.slice(comma + 1), "base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Dọn chữ giống hệt nhánh PDF để hai nguồn cho ra định dạng như nhau. */
function cleanup(raw: string): string {
  const NUL = new RegExp(String.fromCharCode(0), "g");
  return raw
    .replace(NUL, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Trích chữ từ file .docx (data URL hoặc URL công khai).
 * `extractRawText` lấy cả chữ trong BẢNG (mỗi ô thành một đoạn), nên đề dùng
 * bảng điền từ vẫn ra câu hỏi — khác hẳn bảng in dạng ảnh trong PDF.
 */
export async function extractDocxText(url: string): Promise<string> {
  const buffer = await loadBuffer(url);
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return cleanup(value ?? "");
}

/** Trích chữ theo đúng loại file. Không đoán được thì coi như PDF (hành vi cũ). */
export async function extractDocumentText(url: string): Promise<string> {
  return (detectDocKind(url) ?? "pdf") === "docx" ? extractDocxText(url) : extractPdfText(url);
}
