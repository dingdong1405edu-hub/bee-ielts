import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  topic: z.string().trim().min(1),
  imageUrl: z.string().url().nullable().optional(),
  part1Questions: z.array(z.string().trim().min(1)).min(1),
  part2CueCard: z.object({
    topic: z.string().trim().min(1),
    points: z.array(z.string().trim().min(1)).min(1),
  }),
  part3Questions: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { topic, imageUrl, part1Questions, part2CueCard, part3Questions } = parsed.data;

  const set = await prisma.speakingSet.create({
    data: {
      topic,
      imageUrl: imageUrl ?? null,
      part1Questions,
      part2CueCard,
      part3Questions,
    },
  });
  return NextResponse.json({ id: set.id });
}
