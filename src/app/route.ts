import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Homepage ("trang chủ") = the hand-authored `index.html` at the repo ROOT,
 * served VERBATIM and never modified. It is a complete standalone document
 * (its own <head>, Google Fonts, <style> and <script>s), so this root Route
 * Handler bypasses the Next RootLayout and returns the raw bytes exactly as
 * written.
 *
 * The asset paths it uses under `/public/*` and its `*.html` skill-card links
 * are mapped to the real Next `public/` assets and app routes by rewrites in
 * `next.config.mjs` — so the file itself stays byte-for-byte unchanged.
 *
 * Read once at build time (force-static) → `/` is a fast static HTML response.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const html = await readFile(join(process.cwd(), "index.html"), "utf8");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
