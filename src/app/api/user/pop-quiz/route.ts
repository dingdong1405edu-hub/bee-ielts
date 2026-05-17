import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ on: z.boolean() });

/** Toggle the surprise vocab pop-quiz feature. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { popQuizOn: parsed.data.on },
  });
  return NextResponse.json({ ok: true });
}
