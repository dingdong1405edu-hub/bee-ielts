import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isTeacherOrAdmin } from "@/lib/teacher-auth";
import { TeacherTabs } from "@/components/teacher/teacher-tabs";

/**
 * Teacher Portal shell. Role is checked against the DB here (Node runtime), not
 * the JWT — a freshly-promoted teacher would otherwise bounce until their token
 * re-issues. Middleware already redirects anonymous users to /login.
 */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!dbUser || !isTeacherOrAdmin(dbUser.role)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link href="/teacher" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            Teacher Portal
          </Link>
          <Link
            href="/dashboard"
            className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Về học tập
          </Link>
        </div>
        <TeacherTabs />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
