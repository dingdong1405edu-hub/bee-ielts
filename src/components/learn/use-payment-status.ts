"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type PaymentStatusValue = "PENDING" | "PAID" | "CANCELLED" | "FAILED";

export interface PaymentSnapshot {
  status: PaymentStatusValue;
  premium: boolean;
  premiumUntil: string | null;
}

/**
 * Watch an order until it settles.
 *
 * The QR screen can stay open for minutes while the customer opens a banking
 * app, so the two check depths are used at different cadences:
 *
 *   - every 3 s  → cheap read of our own row. The webhook settles the order
 *     almost instantly after the transfer, so this catches the normal case.
 *   - every 15 s → `deep=1`, which re-asks the PayOS API. This is the fallback
 *     that still works if the webhook is unregistered or fails.
 *
 * Polling stops as soon as the order settles, and gives up after ~12 minutes so
 * an abandoned tab doesn't hammer the API forever (the manual "Kiểm tra lại"
 * button always runs a deep check).
 */
const TICK_MS = 3000;
const DEEP_EVERY = 5; // every 5th tick → 15 s
const MAX_TICKS = 240; // ≈12 minutes

export function usePaymentStatus(orderCode: number, initial: PaymentSnapshot) {
  const [snapshot, setSnapshot] = useState<PaymentSnapshot>(initial);
  const [checking, setChecking] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const ticksRef = useRef(0);
  const inFlightRef = useRef(false);

  const settled = snapshot.status !== "PENDING";

  const check = useCallback(
    async (deep: boolean) => {
      // A slow request must not stack up behind the interval.
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      if (deep) setChecking(true);
      try {
        const res = await fetch(
          `/api/payment/status?orderCode=${orderCode}${deep ? "&deep=1" : ""}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as Partial<PaymentSnapshot>;
        if (!data.status) return;
        setSnapshot((prev) => ({
          status: data.status ?? prev.status,
          premium: data.premium ?? prev.premium,
          premiumUntil: data.premiumUntil ?? prev.premiumUntil,
        }));
      } catch {
        // Transient network error — the next tick retries.
      } finally {
        inFlightRef.current = false;
        if (deep) setChecking(false);
      }
    },
    [orderCode],
  );

  useEffect(() => {
    if (settled || gaveUp) return;
    const id = setInterval(() => {
      ticksRef.current += 1;
      if (ticksRef.current > MAX_TICKS) {
        setGaveUp(true);
        return;
      }
      void check(ticksRef.current % DEEP_EVERY === 0);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [settled, gaveUp, check]);

  /** Manual re-check: always deep, and restarts the countdown. */
  const recheck = useCallback(() => {
    ticksRef.current = 0;
    setGaveUp(false);
    void check(true);
  }, [check]);

  return { ...snapshot, settled, checking, gaveUp, recheck };
}
