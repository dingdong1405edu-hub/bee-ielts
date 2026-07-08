/**
 * POST /api/reading/translate-passage
 *
 * Batch-translates every content word in a Reading passage in ONE Claude
 * call so the player can hand out instant popups when the learner clicks
 * a word — instead of paying for a Claude round-trip per click. The
 * response is a flat map { wordLower: { pos, vi } } that the client
 * caches in memory for the duration of the reading session.
 *
 * Server-side cache: keyed by passage SHA-256 so two learners opening the
 * same test share the result. TTL 7 days (passage text rarely changes).
 *
 * Auth: any logged-in user.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { getAnthropicClient } from "@/lib/api-keys";

// Haiku 4.5: cheap + fast, more than enough quality for single-word
// dictionary glosses across a 500-word passage.
const MODEL = "claude-haiku-4-5-20251001";

const schema = z.object({
  passage: z.string().min(1).max(20_000),
  /** Optional: pass a stable id (e.g. ReadingTest.id) so the response can
   *  also be keyed by ID, not just passage hash, for cleaner client cache
   *  invalidation. */
  passageId: z.string().optional(),
});

interface WordEntry {
  pos: string;
  vi: string;
}
interface CachedResult {
  words: Record<string, WordEntry>;
  ts: number;
}
const cache = new Map<string, CachedResult>();
const MAX_CACHE = 200; // ~200 distinct passages
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const SYSTEM = `You translate English vocabulary for a Vietnamese IELTS learner.

You receive a passage (which the learner will read). Return a JSON object whose KEYS are every distinct CONTENT word in the passage (lowercased, lemma form) and whose VALUES are { pos, vi }.

- pos: short Vietnamese part-of-speech: "danh từ" | "động từ" | "tính từ" | "trạng từ" | "giới từ" | "liên từ" | "đại từ" | "khác"
- vi: short Vietnamese gloss (1-4 words). Strip surrounding quotes.

INCLUDE:
- All nouns, verbs, adjectives, adverbs
- Common prepositions/conjunctions/pronouns (a, the, in, of, but, however...) — short gloss like "ở, trong" / "nhưng"

EXCLUDE only:
- Numbers and dates expressed as digits ("2024", "12")
- Proper nouns that have no Vietnamese gloss (most place names — but DO include if there's a common name like "London" → "Luân Đôn")

When the SAME word appears multiple times in different forms (e.g. "ran", "running", "runs"), only key the LEMMA ("run") once. The client lowercases + lemmatises before lookup.

Return ONLY valid JSON. No markdown, no commentary. Schema:

type Result = {
  words: { [wordLower: string]: { pos: string; vi: string } };
};`;

function passageKey(passage: string, passageId?: string): string {
  const h = createHash("sha256").update(passage).digest("hex").slice(0, 16);
  return passageId ? `${passageId}:${h}` : h;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { passage, passageId } = parsed.data;
  const key = passageKey(passage, passageId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return NextResponse.json({ words: hit.words, cached: true });
  }

  try {
    const response = await (await getAnthropicClient()).messages.create({
      model: MODEL,
      // 8000 covers a typical IELTS passage (~500-900 words → ~600 unique
      // → ~25 chars/entry JSON → ~15 KB). Add headroom.
      max_tokens: 8000,
      temperature: 0.2,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Passage:\n"""\n${passage}\n"""\n\nReturn the JSON.`,
        },
      ],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error("[reading/translate-passage] no JSON:", text.slice(0, 200));
      throw new Error("No JSON in response");
    }
    const parsedJson = JSON.parse(text.slice(start, end + 1)) as {
      words?: Record<string, WordEntry>;
    };
    const words = parsedJson.words ?? {};
    // Sanity check: must have at least a handful of entries for a real
    // passage. If Claude returned an empty object, surface that as an
    // error so the client falls back to per-click translation.
    if (Object.keys(words).length < 5) {
      throw new Error("Empty translation map");
    }
    if (cache.size >= MAX_CACHE) {
      const drop = Math.floor(MAX_CACHE * 0.1);
      const dropKeys = Array.from(cache.keys()).slice(0, drop);
      for (const k of dropKeys) cache.delete(k);
    }
    cache.set(key, { words, ts: Date.now() });
    return NextResponse.json({ words, cached: false });
  } catch (e) {
    console.error(
      "[reading/translate-passage] failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Translate failed" },
      { status: 500 },
    );
  }
}
