/**
 * POST /api/shadowing/translate-word
 *
 * Click-to-translate inside the Shadowing player. Receives a single English
 * word + the sentence it appears in (for context) → Claude returns a short
 * Vietnamese gloss + a one-line English definition. Cached in-memory by
 * (word|sentenceHash) so heavy clicking on the same sentence stays cheap.
 *
 * Auth: any logged-in user. Rate-limit is intentionally light — clicks are
 * expected to come in batches when reviewing a sentence.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { getAnthropicClient } from "@/lib/api-keys";

// Per-route model override: translation popups are 1-2 sentence outputs.
// Haiku 4.5 is the right tier — cheap, fast, and known-good as of Jan 2026.
// The repo-wide MODEL (Sonnet) was an older snapshot that started 404-ing
// in prod; pinning Haiku here insulates the popup from that.
const TRANSLATE_MODEL = "claude-haiku-4-5-20251001";

const schema = z.object({
  word: z.string().min(1).max(60),
  sentence: z.string().min(1).max(600),
});

interface CachedResult {
  word: string;
  vi: string;
  pos: string;
  defEn: string;
  ts: number;
}
const cache = new Map<string, CachedResult>();
const MAX_CACHE = 2000;
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

function cacheKey(word: string, sentence: string): string {
  return `${word.toLowerCase()}|${sentence.toLowerCase().slice(0, 120)}`;
}

const SYSTEM = `You are a bilingual English-Vietnamese tutor inside an IELTS shadowing app.
The user clicks a single English word inside a sentence. Return its Vietnamese meaning IN CONTEXT,
plus part-of-speech and a one-line English definition. Be concise — this is shown in a small popup.

Return ONLY valid JSON, no markdown, no commentary, matching this exact TypeScript type:

type WordHint = {
  word: string;     // the lemma/base form (lowercase)
  pos: string;      // short Vietnamese: "danh từ" / "động từ" / "tính từ" / "trạng từ" / "giới từ" / "khác"
  vi: string;       // Vietnamese meaning in this context — short phrase, no surrounding quotes
  defEn: string;    // one-line English definition, <= 14 words
};`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const word = parsed.data.word.replace(/[^A-Za-z'-]/g, "").trim();
  if (!word) {
    return NextResponse.json({ error: "Empty word" }, { status: 400 });
  }
  const key = cacheKey(word, parsed.data.sentence);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return NextResponse.json({ ...hit, cached: true });
  }

  try {
    const userMessage = `Word: "${word}"\nSentence: "${parsed.data.sentence}"\n\nProduce the JSON.`;
    const response = await (await getAnthropicClient()).messages.create({
      model: TRANSLATE_MODEL,
      max_tokens: 220,
      temperature: 0.2,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error(`[translate-word] no JSON in response for "${word}":`, text.slice(0, 200));
      throw new Error("No JSON in response");
    }
    const json = JSON.parse(text.slice(start, end + 1)) as Omit<CachedResult, "ts">;
    const result: CachedResult = {
      word: json.word || word.toLowerCase(),
      pos: json.pos || "",
      vi: json.vi || "",
      defEn: json.defEn || "",
      ts: Date.now(),
    };
    if (cache.size > MAX_CACHE) {
      // Drop oldest 10% when we hit the ceiling.
      const drop = Math.floor(MAX_CACHE * 0.1);
      const keys = Array.from(cache.keys()).slice(0, drop);
      for (const k of keys) cache.delete(k);
    }
    cache.set(key, result);
    return NextResponse.json(result);
  } catch (e) {
    // Log full error server-side so we can debug stale model IDs, quota
    // hits, or API outages without forcing the user to paste console logs.
    console.error(
      `[translate-word] failed word="${word}" model=${TRANSLATE_MODEL}:`,
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Translate failed" },
      { status: 500 },
    );
  }
}
