/**
 * Central resolver + manager for AI provider API keys.
 *
 * A key can live in TWO places:
 *   1. A DB override row (ApiKey table) — set by an admin on /admin/api-keys.
 *   2. The environment variable (Railway) — the default.
 * `getApiKey()` returns the DB override if present, else the env var. So when
 * the DB has no row, behaviour is IDENTICAL to reading process.env directly —
 * the override is purely additive and safe.
 *
 * The point: an admin can replace an expired/invalid key IN THE APP without
 * redeploying, and can live-test which keys are still valid.
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

export type Provider = "GROQ" | "ANTHROPIC" | "DEEPGRAM" | "OPENAI";

export interface ProviderInfo {
  id: Provider;
  label: string;
  env: string;
  /** What breaks if this key is missing/expired — shown to the admin. */
  used: string;
  /** Where to get/rotate the key. */
  console: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "GROQ", label: "Groq", env: "GROQ_API_KEY", used: "Tạo đề Reading/Listening + chấm Writing/Speaking + nhận dạng audio", console: "https://console.groq.com/keys" },
  { id: "ANTHROPIC", label: "Anthropic (Claude)", env: "ANTHROPIC_API_KEY", used: "Đọc trọn PDF Reading (đủ câu) + dịch bài + trích bảng", console: "https://console.anthropic.com/settings/keys" },
  { id: "DEEPGRAM", label: "Deepgram", env: "DEEPGRAM_API_KEY", used: "Nhận dạng giọng nói (Listening/Speaking)", console: "https://console.deepgram.com/" },
  { id: "OPENAI", label: "OpenAI", env: "OPENAI_API_KEY", used: "Whisper (dự phòng) + tạo ảnh bìa", console: "https://platform.openai.com/api-keys" },
];

const PROVIDER_IDS = new Set<string>(PROVIDERS.map((p) => p.id));
export function isProvider(v: unknown): v is Provider {
  return typeof v === "string" && PROVIDER_IDS.has(v);
}
function envName(provider: Provider): string {
  return PROVIDERS.find((p) => p.id === provider)?.env ?? "";
}

// In-memory cache of the DB override so we don't hit the DB on every AI call.
// Short TTL so an admin's change propagates across instances within ~TTL.
const TTL_MS = 30_000;
const cache = new Map<Provider, { value: string | null; ts: number }>();

async function dbOverride(provider: Provider): Promise<string | null> {
  const c = cache.get(provider);
  if (c && Date.now() - c.ts < TTL_MS) return c.value;
  let value: string | null = null;
  try {
    const row = await prisma.apiKey.findUnique({ where: { provider } });
    const v = row?.value?.trim();
    value = v ? v : null;
  } catch {
    // Table missing (pre-migration) or DB hiccup → behave as "no override".
    value = null;
  }
  cache.set(provider, { value, ts: Date.now() });
  return value;
}

/** Resolve a provider's key: DB override first, else the env var. */
export async function getApiKey(provider: Provider): Promise<string | undefined> {
  const override = await dbOverride(provider);
  if (override) return override;
  const env = process.env[envName(provider)];
  return env && env.trim() ? env.trim() : undefined;
}

/** Save an admin-provided key override (upsert) + invalidate the cache. */
export async function setApiKey(provider: Provider, value: string, updatedById?: string): Promise<void> {
  const v = value.trim();
  await prisma.apiKey.upsert({
    where: { provider },
    create: { provider, value: v, updatedById: updatedById ?? null },
    update: { value: v, updatedById: updatedById ?? null },
  });
  cache.set(provider, { value: v, ts: Date.now() });
}

/** Remove the DB override (fall back to env) + invalidate the cache. */
export async function clearApiKey(provider: Provider): Promise<void> {
  await prisma.apiKey.deleteMany({ where: { provider } });
  cache.set(provider, { value: null, ts: Date.now() });
}

export interface KeyStatus {
  provider: Provider;
  label: string;
  used: string;
  console: string;
  /** Where the resolved key comes from. */
  source: "db" | "env" | "none";
  /** Masked hint of the resolved key, e.g. "gsk_…Axjy". */
  masked: string | null;
  /** Whether a DB override row exists. */
  hasOverride: boolean;
  updatedAt: string | null;
}

function mask(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/** Status of every provider (never returns the full key — only a masked hint). */
export async function listKeyStatus(): Promise<KeyStatus[]> {
  const rows = await prisma.apiKey.findMany().catch(() => []);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  return PROVIDERS.map((p) => {
    const row = byProvider.get(p.id);
    const dbVal = row?.value?.trim();
    const envVal = process.env[p.env]?.trim();
    const resolved = dbVal || envVal || "";
    return {
      provider: p.id,
      label: p.label,
      used: p.used,
      console: p.console,
      source: dbVal ? "db" : envVal ? "env" : "none",
      masked: resolved ? mask(resolved) : null,
      hasOverride: !!dbVal,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    };
  });
}

/** Live-ping a provider to check whether a key is valid / not expired. If
 *  `key` is omitted, tests the currently-resolved key (DB override or env). */
export async function testApiKey(
  provider: Provider,
  key?: string,
): Promise<{ ok: boolean; status: number; detail: string }> {
  const k = (key ?? (await getApiKey(provider)))?.trim();
  if (!k) return { ok: false, status: 0, detail: "Chưa cấu hình khoá" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    let res: Response;
    if (provider === "GROQ") {
      res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${k}` },
        signal: ctrl.signal,
      });
    } else if (provider === "ANTHROPIC") {
      res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
        headers: { "x-api-key": k, "anthropic-version": "2023-06-01" },
        signal: ctrl.signal,
      });
    } else if (provider === "DEEPGRAM") {
      res = await fetch("https://api.deepgram.com/v1/projects", {
        headers: { Authorization: `Token ${k}` },
        signal: ctrl.signal,
      });
    } else {
      res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${k}` },
        signal: ctrl.signal,
      });
    }
    if (res.ok) return { ok: true, status: res.status, detail: "Khoá còn sống ✓" };
    if (res.status === 401 || res.status === 403)
      return { ok: false, status: res.status, detail: `Khoá KHÔNG hợp lệ / hết hạn (${res.status})` };
    if (res.status === 429)
      return { ok: true, status: res.status, detail: "Khoá hợp lệ nhưng đang bị giới hạn tần suất (429)" };
    return { ok: false, status: res.status, detail: `Lỗi ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, detail: /abort/i.test(msg) ? "Quá thời gian chờ (timeout)" : msg.slice(0, 120) };
  } finally {
    clearTimeout(timer);
  }
}

// Shared Anthropic client built from the RESOLVED key, rebuilt only when the
// key changes. Used by claude.ts and the per-request route clients so an
// admin-set Anthropic key is honoured everywhere.
let _anthropic: { key: string; client: Anthropic } | null = null;
export async function getAnthropicClient(): Promise<Anthropic> {
  const key = (await getApiKey("ANTHROPIC")) ?? "";
  if (!_anthropic || _anthropic.key !== key) {
    _anthropic = { key, client: new Anthropic({ apiKey: key }) };
  }
  return _anthropic.client;
}
