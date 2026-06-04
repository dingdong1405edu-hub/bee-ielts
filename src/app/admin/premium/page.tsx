import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canGrantPremium } from "@/lib/premium";
import { PremiumAdminClient, type RequestRow, type UserRow } from "./premium-admin-client";

export const dynamic = "force-dynamic";

/**
 * Owner-only queue + user list. ADMIN bounces back to /admin since they
 * can't act on requests anyway; if there's ever a need for read-only
 * admin view, surface it through a separate page.
 */
export default async function AdminPremiumPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !canGrantPremium(me)) redirect("/admin");

  const [pending, decided, premiumLearners] = await Promise.all([
    prisma.premiumRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true, isPremium: true, avatarUrl: true },
        },
      },
    }),
    prisma.premiumRequest.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { decidedAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { isPremium: true, role: "LEARNER" },
      orderBy: { premiumGrantedAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        premiumGrantedAt: true,
      },
    }),
  ]);

  const pendingRows: RequestRow[] = pending.map((r) => ({
    id: r.id,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    user: {
      id: r.user.id,
      email: r.user.email,
      name: r.user.name,
      role: r.user.role,
      isPremium: r.user.isPremium,
      avatarUrl: r.user.avatarUrl,
    },
  }));

  const decidedRows: RequestRow[] = decided.map((r) => ({
    id: r.id,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    user: {
      id: r.user.id,
      email: r.user.email,
      name: r.user.name,
      role: "LEARNER",
      isPremium: false,
      avatarUrl: r.user.avatarUrl,
    },
  }));

  const premiumRows: UserRow[] = premiumLearners.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    premiumGrantedAt: u.premiumGrantedAt?.toISOString() ?? null,
  }));

  return (
    <PremiumAdminClient
      pending={pendingRows}
      decided={decidedRows}
      premiumLearners={premiumRows}
    />
  );
}
