/**
 * POST /api/parent/link — a parent links to their child by the child's email.
 * The child must already have an account (they log in with Google first).
 *
 * Body: { childEmail }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ childEmail: z.string().trim().email("Email không hợp lệ") });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (me.role !== "PARENT" && me.role !== "ADMIN" && me.role !== "OWNER") {
    return NextResponse.json({ error: "Chỉ tài khoản phụ huynh mới liên kết được với con" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const child = await prisma.user.findUnique({
    where: { email: parsed.data.childEmail.toLowerCase() },
    select: { id: true, name: true, email: true },
  });
  if (!child) {
    return NextResponse.json(
      { error: "Chưa tìm thấy tài khoản học sinh với email này. Con cần đăng nhập ít nhất một lần." },
      { status: 404 },
    );
  }
  if (child.id === me.id) {
    return NextResponse.json({ error: "Không thể liên kết với chính mình" }, { status: 400 });
  }

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: me.id, studentId: child.id } },
    create: { parentId: me.id, studentId: child.id },
    update: {},
  });

  return NextResponse.json({
    child: { name: child.name ?? child.email.split("@")[0], email: child.email },
  });
}
