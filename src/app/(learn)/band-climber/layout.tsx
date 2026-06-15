import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { effectivePremium } from "@/lib/premium";

/**
 * Premium gate for the whole "Vượt band" surface. Every route under
 * /band-climber bounces non-premium LEARNERs to /premium so the CTA to
 * upgrade is the first thing they see — instead of a half-rendered
 * stage list with locked stages everywhere.
 *
 * OWNER + ADMIN are implicitly premium via effectivePremium(), so they
 * walk straight through.
 */
export default async function BandClimberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isPremium: true, premiumUntil: true },
  });
  if (!user) redirect("/login");
  if (
    !effectivePremium(
      user as { role: "LEARNER" | "ADMIN" | "OWNER"; isPremium: boolean; premiumUntil: Date | null },
    )
  ) {
    redirect("/premium?from=band-climber");
  }
  return <>{children}</>;
}
