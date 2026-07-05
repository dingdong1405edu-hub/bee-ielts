import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WelcomePicker } from "./welcome-picker";

export const dynamic = "force-dynamic";

const homeFor = (role?: string | null) =>
  role === "TEACHER" ? "/teacher" : role === "PARENT" ? "/parent" : "/dashboard";

/**
 * Onboarding / role router. Order matters:
 *   1. An explicit ?role=… from the login dropdown WINS — apply it (even for a
 *      returning user) and go to that persona's home. This is what makes
 *      "chọn Giáo viên → vào trang giáo viên" work for existing accounts too.
 *      ADMIN/OWNER are never demoted; they just get routed.
 *   2. No explicit choice + already onboarded → their current role's home.
 *   3. No explicit choice + brand-new → the 3-card picker.
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

  const isValidRole = roleParam === "LEARNER" || roleParam === "TEACHER" || roleParam === "PARENT";

  // 1) Explicit login-dropdown choice — authoritative.
  if (isValidRole) {
    const keepRole = me?.role === "ADMIN" || me?.role === "OWNER";
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardedAt: new Date(), ...(keepRole ? {} : { role: roleParam }) },
    });
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    redirect(safeNext ?? homeFor(keepRole ? me?.role : roleParam));
  }

  // 2) Already picked before → straight to their home.
  if (me?.onboardedAt) redirect(homeFor(me.role));

  // 3) Brand-new, no hint → show the picker.
  return <WelcomePicker name={session.user.name ?? null} />;
}
