import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ExamWorkspace } from "@/components/learn/exam-workspace";
import { HomeworkWriting } from "@/components/learn/homework-writing";
import { HomeworkSpeaking } from "@/components/learn/homework-speaking";
import { HomeworkReading } from "@/components/learn/homework-reading";

export const dynamic = "force-dynamic";

/** Does this assignment carry a native reading test (passage in config)? Such
 *  assignments render in the native ReadingShell, not the PDF answer sheet. */
function hasReadingPassage(config: unknown): boolean {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    const r = (config as Record<string, unknown>).reading;
    if (r && typeof r === "object" && !Array.isArray(r)) {
      return typeof (r as Record<string, unknown>).passage === "string" && ((r as Record<string, unknown>).passage as string).length > 0;
    }
  }
  return false;
}

/** Student exam page — làm bài tập giáo viên giao. Dispatches by skill: Writing
 *  → essay editor, Speaking → recorder, native Reading (AI-generated) → the
 *  ReadingShell homework, else (legacy paper / objective) → ExamWorkspace. Each
 *  component client-loads its own data (timer, lock, grade). */
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
    select: { skill: true, config: true },
  });

  const nativeReading = assignment?.skill === "READING" && hasReadingPassage(assignment.config);

  return (
    <div className="px-4 py-4">
      {assignment?.skill === "WRITING" ? (
        <HomeworkWriting assignmentId={assignmentId} />
      ) : assignment?.skill === "SPEAKING" ? (
        <HomeworkSpeaking assignmentId={assignmentId} />
      ) : nativeReading ? (
        <HomeworkReading assignmentId={assignmentId} />
      ) : (
        <ExamWorkspace assignmentId={assignmentId} />
      )}
    </div>
  );
}
