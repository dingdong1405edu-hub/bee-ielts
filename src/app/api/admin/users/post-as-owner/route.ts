import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ userId: z.string().min(1), allow: z.boolean() });

/**
 * OWNER-only: grant / revoke an ADMIN's permission to publish community posts
 * under the Bee (Owner) identity.
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "OWNER") {
    return NextResponse.json({ error: "Chỉ Owner mới cấp được quyền này" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
  if (target.role !== "ADMIN") {
    return NextResponse.json({ error: "Chỉ cấp quyền cho tài khoản ADMIN" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { canPostAsOwner: parsed.data.allow },
  });
  return NextResponse.json({ ok: true });
}
