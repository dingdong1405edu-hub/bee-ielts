import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ListeningTestForm } from "@/components/admin/listening-test-form";

export default async function EditListeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const test = await prisma.listeningTest.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  return (
    <ListeningTestForm
      bank={test.bank}
      initial={{
        id: test.id,
        title: test.title,
        audioUrl: test.audioUrl,
        imageUrl: test.imageUrl,
        contentImageUrl: test.contentImageUrl,
        transcript: test.transcript,
        questions: test.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          options: (q.options as string[] | null) ?? null,
          correctAnswer: q.correctAnswer as string,
          explanation: q.explanation,
          formGroup: q.formGroup,
        })),
      }}
    />
  );
}
