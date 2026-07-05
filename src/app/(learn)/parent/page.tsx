import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ParentDashboard } from "@/components/learn/parent-dashboard";

export const dynamic = "force-dynamic";

/** Parent-facing dashboard — theo dõi tiến độ học của con. Auth gate ở đây;
 *  toàn bộ dữ liệu & UI nằm trong ParentDashboard (client, gọi mock API). */
export default async function ParentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <ParentDashboard />;
}
