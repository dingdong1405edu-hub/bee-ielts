import { ParentDashboard } from "@/components/learn/parent-dashboard";

export const dynamic = "force-dynamic";

/** Parent dashboard page — auth/role gated by the parent layout. All data
 *  loading + the link-child flow live in ParentDashboard (client). */
export default function ParentPage() {
  return <ParentDashboard />;
}
