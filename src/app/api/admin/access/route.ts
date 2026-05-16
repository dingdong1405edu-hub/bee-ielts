import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isOwner, OWNER_EMAIL } from "@/lib/admin";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "LEARNER"]),
});

/** Cấp / thu quyền ADMIN — chỉ owner được gọi. */
export async function POST(req: Request) {
  const session = await auth();
  if (!isOwner(session?.user?.email)) {
    return NextResponse.json({ error: "Chỉ owner mới được cấp quyền" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  if (email === OWNER_EMAIL) {
    return NextResponse.json({ error: "Không thể đổi quyền của owner" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Không tìm thấy người dùng với email này" }, { status: 404 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: parsed.data.role } });
  return NextResponse.json({ ok: true });
}
