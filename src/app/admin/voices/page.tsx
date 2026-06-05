import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { VoicesAdminClient } from "./voices-client";

export const dynamic = "force-dynamic";

export default async function AdminVoicesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN" && (session.user as { role?: string }).role !== "OWNER") {
    redirect("/dashboard");
  }

  const voices = await prisma.speakingVoice.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Speaking Voices</h1>
        <p className="text-muted-foreground">
          Quản lý danh sách giọng giám khảo dùng cho phần Speaking. Voice ID dùng Deepgram Aura format
          (ví dụ: <code className="text-xs bg-muted px-1 py-0.5 rounded">aura-2-aurora-en</code>).
        </p>
      </div>
      <VoicesAdminClient initialVoices={voices.map((v) => ({
        id: v.id,
        voiceId: v.voiceId,
        name: v.name,
        accent: v.accent,
        gender: v.gender,
        enabled: v.enabled,
        isDefault: v.isDefault,
        order: v.order,
      }))} />
    </div>
  );
}
