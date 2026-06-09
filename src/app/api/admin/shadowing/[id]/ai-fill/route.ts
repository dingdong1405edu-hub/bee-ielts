import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { enrichShadowingSegments, fixShadowingSegments } from "@/lib/claude";

/**
 * POST /api/admin/shadowing/[id]/ai-fill
 *
 * Two modes:
 *
 * - mode: "fill" (default) — keeps textEn as-is, returns ipa + textVi.
 *   Use after admin manually edited textEn and wants AI to refresh the
 *   secondary fields.
 *
 * - mode: "fix" — Claude ALSO cleans textEn (capitalization, punctuation,
 *   obvious Whisper homophones like "your/you're"), then returns the
 *   cleaned textEn together with ipa + textVi. Use when the segments came
 *   from STT and the English itself is messy.
 *
 * Stateless: the client sends the rows it wants processed (with a stable
 * `key` so we can match the response back), we never read or write segments
 * here. The edit page applies the result to local state and saves it later
 * through the PATCH endpoint.
 *
 * Chunking: requests are split into batches before Claude is called so we
 * don't blow Claude's 8000-token output cap when a lesson has 30-80
 * segments. Empirically:
 *   - fix mode needs ~180 tokens/segment → batch 12 → ~2160 tokens
 *   - fill mode needs ~110 tokens/segment → batch 18 → ~1980 tokens
 * Both batches run in parallel — wall-clock = slowest single Claude call.
 */
const bodySchema = z.object({
  mode: z.enum(["fill", "fix"]).optional().default("fill"),
  items: z
    .array(
      z.object({
        key: z.string().min(1),
        textEn: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(120),
});

export const maxDuration = 180;

const FIX_BATCH = 12;
const FILL_BATCH = 18;

type InputItem = { key: string; textEn: string };
type ResultItem = { key: string; textEn: string; ipa: string; textVi: string };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function runFix(items: InputItem[]): Promise<ResultItem[]> {
  const batches = chunk(items, FIX_BATCH);
  const settled = await Promise.allSettled(
    batches.map(async (batch) => {
      const fixed = await fixShadowingSegments({
        segments: batch.map((x) => ({ textEn: x.textEn })),
      });
      return batch.map<ResultItem>((x, i) => {
        const match = fixed.find((e) => e.index === i + 1);
        return {
          key: x.key,
          textEn: match?.textEn ?? x.textEn,
          ipa: match?.ipa ?? "",
          textVi: match?.textVi ?? "",
        };
      });
    }),
  );
  const out: ResultItem[] = [];
  const failures: string[] = [];
  for (const [i, s] of settled.entries()) {
    if (s.status === "fulfilled") {
      out.push(...s.value);
    } else {
      failures.push(
        `batch #${i + 1} (${batches[i].length} đoạn): ${
          s.reason instanceof Error ? s.reason.message : String(s.reason)
        }`,
      );
      // Keep the original textEn for the failed batch so the admin doesn't
      // lose data — just skips IPA + textVi on those rows.
      for (const x of batches[i]) {
        out.push({ key: x.key, textEn: x.textEn, ipa: "", textVi: "" });
      }
    }
  }
  if (failures.length === settled.length) {
    throw new Error(`Tất cả batch AI fail: ${failures[0]}`);
  }
  if (failures.length > 0) {
    console.warn("[ai-fill/fix] partial failure:", failures.join(" | "));
  }
  return out;
}

async function runFill(items: InputItem[]): Promise<ResultItem[]> {
  const batches = chunk(items, FILL_BATCH);
  const settled = await Promise.allSettled(
    batches.map(async (batch) => {
      const enriched = await enrichShadowingSegments({
        segments: batch.map((x) => ({ textEn: x.textEn })),
      });
      return batch.map<ResultItem>((x, i) => {
        const match = enriched.find((e) => e.index === i + 1);
        return {
          key: x.key,
          textEn: x.textEn,
          ipa: match?.ipa ?? "",
          textVi: match?.textVi ?? "",
        };
      });
    }),
  );
  const out: ResultItem[] = [];
  const failures: string[] = [];
  for (const [i, s] of settled.entries()) {
    if (s.status === "fulfilled") {
      out.push(...s.value);
    } else {
      failures.push(
        `batch #${i + 1}: ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`,
      );
      for (const x of batches[i]) {
        out.push({ key: x.key, textEn: x.textEn, ipa: "", textVi: "" });
      }
    }
  }
  if (failures.length === settled.length) {
    throw new Error(`Tất cả batch AI fail: ${failures[0]}`);
  }
  if (failures.length > 0) {
    console.warn("[ai-fill/fill] partial failure:", failures.join(" | "));
  }
  return out;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;
  if (!me || !isAdminOrOwner(me)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const lesson = await prisma.shadowingLesson.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const items =
      parsed.data.mode === "fix"
        ? await runFix(parsed.data.items)
        : await runFill(parsed.data.items);
    return NextResponse.json({ items, mode: parsed.data.mode });
  } catch (e) {
    console.error(
      `[ai-fill] mode=${parsed.data.mode} count=${parsed.data.items.length} failed:`,
      e,
    );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI lỗi" },
      { status: 502 },
    );
  }
}
