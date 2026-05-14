import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  targetBand: z.number().min(3).max(9),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid band" }, { status: 400 });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { targetBand: parsed.data.targetBand },
  });
  return NextResponse.json({ ok: true });
}
