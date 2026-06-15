/**
 * Premium plans sold via PayOS.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  PLACEHOLDER PRICES — edit `priceVnd` below to your real prices.     │
 * │  These are samples so the flow works end-to-end before launch.      │
 * │                                                                     │
 * │  The 3 PayOS codes (PAYOS_CLIENT_ID, PAYOS_API_KEY,                  │
 * │  PAYOS_CHECKSUM_KEY) do NOT go here — set them in .env / Railway.    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Each plan is a one-off purchase: paying extends premium by `months` from
 * the later of (now, the user's current premiumUntil). When premiumUntil
 * passes, the auth layer drops the user back to free automatically
 * (see the jwt callback in src/auth.ts).
 */

export interface PremiumPlan {
  /** Stable id sent from the client to /api/premium/checkout. */
  id: string;
  label: string;
  months: number;
  /** Price in VND (integer). PayOS amounts are whole đồng. */
  priceVnd: number;
  /** Optional ribbon shown on the plan card. */
  badge?: string;
  /** Visually emphasise this plan (the recommended one). */
  highlight?: boolean;
}

// 👇 EDIT THESE — labels, months, and prices are all yours to change.
export const PREMIUM_PLANS: PremiumPlan[] = [
  { id: "1m", label: "1 tháng", months: 1, priceVnd: 99_000 },
  { id: "3m", label: "3 tháng", months: 3, priceVnd: 249_000, badge: "Phổ biến", highlight: true },
  { id: "12m", label: "12 tháng", months: 12, priceVnd: 799_000, badge: "Tiết kiệm nhất" },
];

export function getPlan(id: string): PremiumPlan | undefined {
  return PREMIUM_PLANS.find((p) => p.id === id);
}

/**
 * Add whole months to a date. Clamps day-of-month overflow so e.g.
 * Jan 31 + 1 month → Feb 28/29 instead of spilling into March.
 */
export function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}
