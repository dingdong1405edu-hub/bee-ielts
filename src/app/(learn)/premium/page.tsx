import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { effectivePremium } from "@/lib/premium";
import { PremiumLanding } from "./premium-landing";

export const dynamic = "force-dynamic";

/**
 * Premium landing + request page. Three states:
 *   - already premium → show success card + back to dashboard
 *   - has PENDING request → show "đang chờ owner duyệt" state
 *   - otherwise → show benefits + request form
 */
export default async function PremiumPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [user, latest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        isPremium: true,
        premiumUntil: true,
        premiumGrantedAt: true,
        email: true,
        name: true,
      },
    }),
    prisma.premiumRequest.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true, status: true, createdAt: true, decidedAt: true },
    }),
  ]);
  if (!user) redirect("/login");

  const premium = effectivePremium(
    user as {
      role: "LEARNER" | "ADMIN" | "OWNER";
      isPremium: boolean;
      premiumUntil: Date | null;
    },
  );

  return (
    <PremiumLanding
      role={user.role}
      isPremium={premium}
      premiumUntil={user.premiumUntil?.toISOString() ?? null}
      premiumGrantedAt={user.premiumGrantedAt?.toISOString() ?? null}
      latestRequest={
        latest
          ? {
              id: latest.id,
              status: latest.status,
              message: latest.message,
              createdAt: latest.createdAt.toISOString(),
              decidedAt: latest.decidedAt?.toISOString() ?? null,
            }
          : null
      }
    />
  );
}
