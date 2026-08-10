import {
  PayOS,
  APIError,
  ConnectionError,
  ConnectionTimeoutError,
  ForbiddenError,
  TooManyRequestError,
  UnauthorizedError,
} from "@payos/node";

/**
 * Singleton PayOS client. Pulls credentials from env at first use; callers
 * should check `isConfigured()` first so missing env yields a clean 503
 * instead of crashing the route at construction.
 */
let client: PayOS | null = null;

/**
 * Read a PayOS credential from env, tolerating how it was pasted.
 *
 * A `.env` file needs quotes around values; a Railway/Vercel dashboard variable
 * does NOT — pasting `"abc"` there stores the quote characters as part of the
 * secret. PayOS then rejects every request as unauthorized, which used to
 * surface as the same generic "kiểm tra credentials" error as everything else.
 * Trimming quotes/whitespace here makes both paste styles work.
 */
function credential(name: string): string {
  const raw = process.env[name];
  if (!raw) return "";
  let v = raw.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function isConfigured(): boolean {
  return !!(credential("PAYOS_CLIENT_ID") && credential("PAYOS_API_KEY") && credential("PAYOS_CHECKSUM_KEY"));
}

export function getPayos(): PayOS {
  if (client) return client;
  if (!isConfigured()) {
    throw new Error(
      "PayOS chưa cấu hình — đặt PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env.local",
    );
  }
  client = new PayOS({
    clientId: credential("PAYOS_CLIENT_ID"),
    apiKey: credential("PAYOS_API_KEY"),
    checksumKey: credential("PAYOS_CHECKSUM_KEY"),
  });
  return client;
}

/**
 * PayOS reports business failures as **HTTP 200 with a `code` field** — it does
 * not use HTTP status codes for them. Verified against the live API:
 *
 *   "214" → cổng/kênh thanh toán không tồn tại hoặc đã tạm dừng
 *           (this is what wrong PAYOS_CLIENT_ID / PAYOS_API_KEY looks like)
 *   "231" → đơn thanh toán đã tồn tại (orderCode reused)
 *   "101" → mã thanh toán không tồn tại (unknown orderCode on lookup)
 *   "20"  → dữ liệu không hợp lệ (e.g. description quá 25 ký tự)
 *
 * So never branch on `UnauthorizedError` alone for "bad credentials" — that
 * class simply never fires for these.
 */
export const PAYOS_CODE = {
  BAD_CHANNEL: "214",
  DUPLICATE_ORDER: "231",
  NOT_FOUND: "101",
  INVALID_DATA: "20",
} as const;

/** The PayOS business code on a thrown SDK error, if any. */
export function payosCode(e: unknown): string | null {
  return e instanceof APIError ? (e.code ?? null) : null;
}

/**
 * Turn a thrown PayOS SDK error into an honest, actionable message.
 *
 * The old code answered EVERY checkout failure with "Kiểm tra credentials
 * PayOS" — including the failure that was actually a database overflow. That
 * one sentence sent the investigation to the wrong place entirely, so each
 * cause now says what it really is.
 */
export function describePayosFailure(e: unknown): { message: string; detail: string } {
  const detail =
    e instanceof APIError
      ? `status=${e.status} code=${e.code ?? "?"} desc=${e.desc ?? "?"}`
      : e instanceof Error
        ? e.message
        : String(e);

  switch (payosCode(e)) {
    case PAYOS_CODE.BAD_CHANNEL:
      return {
        message:
          "PayOS từ chối: kênh thanh toán không tồn tại hoặc đang tạm dừng. Kiểm tra PAYOS_CLIENT_ID / PAYOS_API_KEY trên server (dán KHÔNG kèm dấu nháy) và trạng thái kênh trong my.payos.vn.",
        detail,
      };
    case PAYOS_CODE.DUPLICATE_ORDER:
      return { message: "Mã đơn hàng bị trùng. Vui lòng bấm lại.", detail };
    case PAYOS_CODE.INVALID_DATA:
      return {
        message: `PayOS từ chối dữ liệu đơn hàng: ${e instanceof APIError ? (e.desc ?? "") : ""}`.trim(),
        detail,
      };
    case PAYOS_CODE.NOT_FOUND:
      return { message: "Không tìm thấy đơn hàng này trên PayOS.", detail };
  }

  if (e instanceof UnauthorizedError || e instanceof ForbiddenError) {
    return {
      message:
        "PayOS từ chối xác thực. Kiểm tra PAYOS_CLIENT_ID và PAYOS_API_KEY trên server (dán KHÔNG kèm dấu nháy).",
      detail,
    };
  }
  if (e instanceof ConnectionError || e instanceof ConnectionTimeoutError) {
    return { message: "Không kết nối được tới PayOS. Vui lòng thử lại sau ít phút.", detail };
  }
  if (e instanceof TooManyRequestError) {
    return { message: "PayOS đang giới hạn tần suất. Vui lòng thử lại sau ít phút.", detail };
  }
  if (e instanceof APIError) {
    return { message: `PayOS từ chối đơn hàng (${e.code ?? e.status}). Vui lòng thử lại.`, detail };
  }
  return { message: "Không tạo được link thanh toán. Vui lòng thử lại.", detail };
}

/**
 * `Payment.orderCode` is a Prisma `Int` → Postgres INTEGER, whose ceiling is
 * 2 147 483 647. A raw `Date.now()` (ms since epoch, ~1.79e12) is ~830× that,
 * so `prisma.payment.create()` threw "value out of range for type integer" on
 * EVERY checkout — after the PayOS link had already been created. The route's
 * catch-all turned that into "Không tạo được link thanh toán. Kiểm tra
 * credentials PayOS.", which is why the credentials looked like the culprit.
 *
 * Taking the timestamp modulo 2e9 keeps a code that is unique to the
 * millisecond and always fits. The window wraps every ~23 days, so a
 * collision needs two orders on the exact same millisecond 23 days apart —
 * and `createPendingPayment()` retries on the unique index anyway.
 */
export const MAX_ORDER_CODE = 2_147_483_647;
const ORDER_CODE_WINDOW = 2_000_000_000;

export function newOrderCode(attempt = 0): number {
  // 7919 is prime, so retries walk the window instead of re-hitting neighbours.
  const code = (Date.now() + attempt * 7919) % ORDER_CODE_WINDOW;
  // PayOS rejects tiny order codes (and 123 is its reserved webhook-test code).
  return code < 10_000 ? code + 10_000 : code;
}

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/**
 * Base URL to build PayOS `returnUrl` / `cancelUrl` from. Prefers
 * NEXT_PUBLIC_APP_URL, but falls back to the live request origin when that env
 * var still holds a localhost value in a deployed environment — otherwise a
 * paying customer gets bounced to a dead link after checkout.
 */
export function resolveAppUrl(req: Request): string {
  const origin = new URL(req.url).origin;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (!configured) return origin;
  if (LOCAL_HOST.test(configured) && !LOCAL_HOST.test(origin)) return origin;
  return configured;
}
