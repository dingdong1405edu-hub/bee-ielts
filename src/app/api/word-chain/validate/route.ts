import { NextResponse } from "next/server";

/**
 * Word-chain dictionary check. Proxies the Free Dictionary API server-side so
 * the browser never hits CORS and we can normalise the result.
 *
 *   GET /api/word-chain/validate?word=apple
 *   → { valid: true }              từ có trong từ điển
 *   → { valid: false }             từ không tồn tại / sai chính tả
 *   → { valid: false, error: "network" }  không kiểm tra được (mạng/timeout)
 *
 * Strict by design: only words the dictionary recognises pass. On a network
 * error we return valid:false WITH an error flag so the client can show
 * "thử lại" without ending the game or resetting the timer.
 */
export const dynamic = "force-dynamic";

const DICT_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("word") ?? "";
  const word = raw.trim().toLowerCase();

  // Cheap format gate before spending a network round-trip.
  if (!/^[a-z][a-z'-]*[a-z]$/.test(word) || word.length < 2) {
    return NextResponse.json({ valid: false, reason: "format" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(DICT_URL + encodeURIComponent(word), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      // Cache identical lookups at the edge — same word is always same answer.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (res.ok) return NextResponse.json({ valid: true });
    if (res.status === 404) return NextResponse.json({ valid: false, reason: "notfound" });
    // Any other status → treat as "couldn't verify".
    return NextResponse.json({ valid: false, error: "network" });
  } catch {
    return NextResponse.json({ valid: false, error: "network" });
  } finally {
    clearTimeout(timeout);
  }
}
