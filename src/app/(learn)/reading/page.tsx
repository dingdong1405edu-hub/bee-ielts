import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function bandToCEFR(band: number): "A2" | "B1" | "B2" | "C1" | "C2" {
  if (band <= 4.5) return "A2";
  if (band <= 5.5) return "B1";
  if (band <= 6.5) return "B2";
  if (band <= 7.5) return "C1";
  return "C2";
}

export default async function ReadingAutoPickPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { targetBand: true },
  });
  const cefr = bandToCEFR(user?.targetBand ?? 6.0);

  // Find recently attempted reading tests to avoid repeating
  const recent = await prisma.attempt.findMany({
    where: { userId: session.user.id, skill: "READING" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { refId: true },
  });
  const recentIds = recent.map((r) => r.refId.replace("mock-", ""));

  // Try to find a test matching band that user hasn't done recently
  let test = await prisma.readingTest.findFirst({
    where: { level: cefr, id: { notIn: recentIds.length > 0 ? recentIds : ["__none__"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!test) test = await prisma.readingTest.findFirst({ where: { level: cefr } });
  if (!test) {
    const all = await prisma.readingTest.findMany({ select: { id: true } });
    if (all.length === 0) {
      return (
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="text-2xl font-extrabold">Chưa có đề Reading nào</h1>
          <p className="text-muted-foreground mt-2">Admin hãy seed thêm đề.</p>
        </div>
      );
    }
    test = (await prisma.readingTest.findUnique({ where: { id: all[Math.floor(Math.random() * all.length)].id } }))!;
  }

  redirect(`/reading/${test.id}`);
}
