import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MiniQuizForm } from "../mini-quiz-form";

export const dynamic = "force-dynamic";

const ALLOWED_SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING"] as const;
type Skill = (typeof ALLOWED_SKILLS)[number];

export default async function NewMiniQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ skill?: string }>;
}) {
  const { id } = await params;
  const { skill } = await searchParams;
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }
  const stage = await prisma.bandStage.findUnique({
    where: { id },
    select: { id: true, title: true, fromBand: true, toBand: true },
  });
  if (!stage) notFound();

  // Pre-select the skill if the admin opened "Thêm mini-quiz" from inside
  // a Reading/Listening/Writing/Speaking exercise hub card.
  const defaultSkill = (ALLOWED_SKILLS as readonly string[]).includes(skill ?? "")
    ? (skill as Skill)
    : undefined;

  return <MiniQuizForm stage={stage} mode="create" defaultSkill={defaultSkill} />;
}
