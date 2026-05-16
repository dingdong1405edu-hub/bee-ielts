import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/admin";
import { AccessManager } from "./access-manager";

export default async function AdminAccessPage() {
  const session = await auth();
  if (!isOwner(session?.user?.email)) redirect("/admin");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: { id: true, email: true, name: true, role: true },
    take: 200,
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Phân quyền</h1>
        <p className="text-muted-foreground">
          Cấp hoặc thu quyền quản trị. Chỉ owner thấy trang này.
        </p>
      </div>
      <AccessManager users={users} />
    </div>
  );
}
