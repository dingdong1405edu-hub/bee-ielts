import { PayOS } from "@payos/node";

/**
 * Singleton PayOS client. Pulls credentials from env at first use; callers
 * should check `isConfigured()` first so missing env yields a clean 503
 * instead of crashing the route at construction.
 */
let client: PayOS | null = null;

export function isConfigured(): boolean {
  return !!(
    process.env.PAYOS_CLIENT_ID &&
    process.env.PAYOS_API_KEY &&
    process.env.PAYOS_CHECKSUM_KEY
  );
}

export function getPayos(): PayOS {
  if (client) return client;
  if (!isConfigured()) {
    throw new Error(
      "PayOS chưa cấu hình — đặt PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env.local",
    );
  }
  client = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID!,
    apiKey: process.env.PAYOS_API_KEY!,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
  });
  return client;
}

/**
 * PayOS requires an integer `orderCode` (max 9 007 199 254 740 991). Use the
 * current ms timestamp — unique per order, easy to correlate with logs.
 */
export function newOrderCode(): number {
  return Date.now();
}
