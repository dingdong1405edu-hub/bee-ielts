import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MiniQuizForm } from "../mini-quiz-form";

export const dynamic = "force-dynamic";

export default async function NewMiniQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }
  const stage = await prisma.bandStage.findUnique({
    where: { id },
    select: { id: true, title: true, fromBand: true, toBand: true },
  });
  if (!stage) notFound();

  return <MiniQuizForm stage={stage} mode="create" />;
}
