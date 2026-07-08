import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/admin";
import { listKeyStatus } from "@/lib/api-keys";
import { ApiKeysManager } from "@/components/admin/api-keys-manager";
import { KeyRound, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

/** OWNER-only page to view/replace the AI provider keys without redeploying. */
export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });
  if (!me || (me.role !== "OWNER" && !isOwner(me.email))) redirect("/admin");

  const providers = await listKeyStatus();

  return (
    <div className="max-w-3xl space-y-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <KeyRound className="h-6 w-6 text-primary" /> Khoá API (AI)
        </h1>
        <p className="text-sm text-muted-foreground">
          Xem khoá nào còn sống / hết hạn và <strong>thay khoá ngay trong app</strong> — không cần sửa Railway rồi Redeploy.
          Khoá lưu ở đây sẽ được ưu tiên dùng thay cho biến môi trường.
        </p>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p>
          Trang này chỉ <strong>chủ sở hữu</strong> mới vào được. Bấm <strong>“Kiểm tra còn sống”</strong> để biết khoá nào hết hạn;
          dán khoá mới rồi <strong>“Lưu”</strong> để thay ngay (có hiệu lực trong ~30 giây trên mọi máy chủ).
        </p>
      </div>

      <ApiKeysManager initial={providers} />
    </div>
  );
}
