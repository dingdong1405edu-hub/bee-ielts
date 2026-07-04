import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ExamWorkspace } from "@/components/learn/exam-workspace";

export const dynamic = "force-dynamic";

/** Student exam page — làm bài tập giáo viên giao. All data loading, timer and
 *  anti-cheat live client-side in ExamWorkspace; this just gates auth. */
export default async function ExamPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { assignmentId } = await params;

  return (
    <div className="px-4 py-4">
      <ExamWorkspace assignmentId={assignmentId} />
    </div>
  );
}
