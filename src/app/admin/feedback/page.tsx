import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrOwner } from "@/lib/premium";
import { FeedbackAdminClient, type FeedbackRow } from "./feedback-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!me || !isAdminOrOwner(me)) redirect("/admin");

  const items = await prisma.feedback.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
  });

  const rows: FeedbackRow[] = items.map((f) => ({
    id: f.id,
    kind: f.kind,
    name: f.name,
    email: f.email,
    message: f.message,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
  }));

  return <FeedbackAdminClient initial={rows} />;
}
