import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { SupportAdminClient } from "./support-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!isAdminOrOwner(me)) redirect("/admin");

  const { user } = await searchParams;

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold md:text-3xl">Tin nhắn hỗ trợ</h1>
        <p className="text-sm text-muted-foreground">Trả lời và hỗ trợ học viên. Tin nhắn gửi đi hiển thị là “Đội ngũ Bee”.</p>
      </div>
      <SupportAdminClient initialUserId={user ?? null} />
    </div>
  );
}
