/**
 * Notification helpers — create per-user notifications that surface in the bell.
 * Best-effort: a failure here must never break the action that triggered it
 * (approving a request, giving an assignment…), so errors are swallowed.
 */
import { prisma } from "@/lib/db";

export interface NotifyInput {
  kind: string; // "class" | …
  title: string;
  body: string;
  href?: string;
}

export async function notify(userId: string, n: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, kind: n.kind, title: n.title, body: n.body, href: n.href ?? null },
    });
  } catch {
    /* non-critical */
  }
}

export async function notifyMany(userIds: string[], n: NotifyInput): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        kind: n.kind,
        title: n.title,
        body: n.body,
        href: n.href ?? null,
      })),
    });
  } catch {
    /* non-critical */
  }
}
