import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WelcomePicker } from "./welcome-picker";

export const dynamic = "force-dynamic";

/** First-run onboarding: pick a persona (Học sinh / Phụ huynh / Giáo viên).
 *  Shown once — anyone already onboarded is sent straight to their home. */
export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, onboardedAt: true },
  });
  if (me?.onboardedAt) {
    if (me.role === "TEACHER") redirect("/teacher");
    if (me.role === "PARENT") redirect("/parent");
    redirect("/dashboard");
  }

  return <WelcomePicker name={session.user.name ?? null} />;
}
