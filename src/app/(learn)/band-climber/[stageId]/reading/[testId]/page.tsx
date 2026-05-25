import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { BandClimbReadingPractice } from "./practice";
import { BAND_4_TO_5_TIPS } from "@/lib/band-climber-reading-sample";

export const dynamic = "force-dynamic";

export default async function BandClimbReadingTestPage({
  params,
}: {
  params: Promise<{ stageId: string; testId: string }>;
}) {
  const { stageId, testId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const test = await prisma.readingTest.findFirst({
    where: { id: testId, bandStageId: stageId },
    include: {
      questions: { orderBy: { order: "asc" } },
      bandStage: {
        select: { id: true, fromBand: true, toBand: true, title: true, subtitle: true },
      },
    },
  });
  if (!test || !test.bandStage) notFound();

  // Tip context sent to Groq with every /api/reading/explain call. For the
  // 4→5 stage we ship the canned brief; future stages can be added here.
  const isFourToFive = test.bandStage.fromBand === 4.0 && test.bandStage.toBand === 5.0;
  const bandClimbContext = isFourToFive ? BAND_4_TO_5_TIPS : "";

  return (
    <BandClimbReadingPractice
      stage={{
        id: test.bandStage.id,
        fromBand: test.bandStage.fromBand,
        toBand: test.bandStage.toBand,
        title: test.bandStage.title,
        subtitle: test.bandStage.subtitle,
      }}
      test={{
        id: test.id,
        title: test.title,
        passage: test.passage,
        imageUrl: test.imageUrl,
        questions: test.questions.map((q) => ({
          id: q.id,
          type: q.type as
            | "MCQ"
            | "FILL_BLANK"
            | "TRUE_FALSE"
            | "TRUE_FALSE_NOT_GIVEN"
            | "MATCHING"
            | "MATCHING_HEADINGS"
            | "MATCHING_INFO"
            | "MATCHING_FEATURES"
            | "MATCHING_SENTENCE_ENDINGS"
            | "SHORT_ANSWER",
          prompt: q.prompt,
          options: (q.options as string[] | null) ?? null,
          correctAnswer: q.correctAnswer as string,
          explanation: q.explanation,
        })),
      }}
      bandClimbContext={bandClimbContext}
    />
  );
}
