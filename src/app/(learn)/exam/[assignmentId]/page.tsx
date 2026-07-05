import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ExamWorkspace } from "@/components/learn/exam-workspace";
import { HomeworkWriting } from "@/components/learn/homework-writing";
import { HomeworkSpeaking } from "@/components/learn/homework-speaking";

export const dynamic = "force-dynamic";

/** Student exam page — làm bài tập giáo viên giao. Dispatches by skill: Writing
 *  → essay editor, Speaking → recorder, else (Reading/Listening/objective) →
 *  ExamWorkspace. Each component client-loads its own data (timer, lock, grade). */
export default async function ExamPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { assignmentId } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { skill: true },
  });

  return (
    <div className="px-4 py-4">
      {assignment?.skill === "WRITING" ? (
        <HomeworkWriting assignmentId={assignmentId} />
      ) : assignment?.skill === "SPEAKING" ? (
        <HomeworkSpeaking assignmentId={assignmentId} />
      ) : (
        <ExamWorkspace assignmentId={assignmentId} />
      )}
    </div>
  );
}
