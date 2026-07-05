import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Parent portal shell. Role checked against the DB (not JWT) so a just-onboarded
 * parent gets in immediately. Middleware already redirects anonymous users.
 */
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || (me.role !== "PARENT" && me.role !== "ADMIN" && me.role !== "OWNER")) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Link href="/parent" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Users className="h-4 w-4" />
            </span>
            Theo dõi con
          </Link>
          <Link
            href="/dashboard"
            className="ml-auto text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Về học tập
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
