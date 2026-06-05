import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";

// Fetching a remote image can be slow on big files.
export const maxDuration = 30;

const schema = z.object({ url: z.string().min(1) });

/** Largest remote image we will pull in and inline as a data URL. */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Fetch a remote image URL on the server and return it as a data URL.
 *
 * Pasting a "Copy image address" link often fails to display because the
 * source site blocks hot-linking (checks the Referer) or only serves the
 * image to logged-in browsers. Pulling the bytes in once — server-side,
 * with a browser-like User-Agent — makes the image self-contained so it
 * always loads afterwards, no matter where it is shown.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Link không hợp lệ" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(parsed.data.url.trim());
  } catch {
    return NextResponse.json({ error: "Link không hợp lệ" }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Chỉ hỗ trợ link http/https" }, { status: 400 });
  }
  const host = target.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local") || host.startsWith("127.")) {
    return NextResponse.json({ error: "Link không hợp lệ" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // A browser-like UA + Referer gets past most hot-link / bot filters.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        Referer: `${target.protocol}//${target.host}/`,
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Không tải được ảnh từ link (HTTP ${res.status})` },
        { status: 502 },
      );
    }
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Link này không trỏ tới một file ảnh. Chuột phải vào ảnh → “Copy image address” để lấy đúng link ảnh.",
        },
        { status: 415 },
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) {
      return NextResponse.json({ error: "Link trả về ảnh rỗng" }, { status: 502 });
    }
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Ảnh quá lớn (tối đa 10 MB)" }, { status: 413 });
    }
    const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
    return NextResponse.json({ dataUrl });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "Tải ảnh quá lâu — link có thể không hợp lệ" : "Không tải được ảnh từ link này" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
