import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SupportChat } from "./support-chat";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Hỗ trợ</h1>
        <p className="text-sm text-muted-foreground">
          Nhắn tin trực tiếp với đội ngũ Bee — hỏi đáp, báo lỗi, hoặc cần trợ giúp gì cứ nói nhé.
        </p>
      </div>
      <SupportChat />
    </div>
  );
}
