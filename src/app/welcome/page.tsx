import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WelcomePicker } from "./welcome-picker";

export const dynamic = "force-dynamic";

const homeFor = (role?: string | null) =>
  role === "TEACHER" ? "/teacher" : role === "PARENT" ? "/parent" : "/dashboard";

/**
 * First-run onboarding. Two ways in:
 *   1. With ?role=… from the login dropdown → apply it and go straight to that
 *      persona's home (no card picker shown).
 *   2. Without it (e.g. the learner-layout gate) → show the 3-card picker.
 * Either way, anyone already onboarded is sent to their home. A role is only
 * applied to a not-yet-onboarded user, so re-visiting can't change a role.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { role: roleParam, next } = await searchParams;
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, onboardedAt: true },
  });

  if (me?.onboardedAt) redirect(homeFor(me.role));

  // Apply the login-dropdown choice for a brand-new user, then send them on.
  if (roleParam === "LEARNER" || roleParam === "TEACHER" || roleParam === "PARENT") {
    const keepRole = me?.role === "ADMIN" || me?.role === "OWNER";
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardedAt: new Date(), ...(keepRole ? {} : { role: roleParam }) },
    });
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    redirect(safeNext ?? homeFor(keepRole ? me?.role : roleParam));
  }

  return <WelcomePicker name={session.user.name ?? null} />;
}
