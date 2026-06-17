import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword, normalizeUsername, USERNAME_RE } from "@/lib/password";

/**
 * Set (or change) the current learner's username + password so they can log in
 * without Google next time. Requires an active session — there is no
 * password-based registration; the account already exists from a Google sign-in.
 */
const schema = z.object({
  username: z
    .string()
    .trim()
    .transform(normalizeUsername)
    .refine((s) => USERNAME_RE.test(s), {
      message: "ID phải dài 3–30 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới",
    }),
  password: z
    .string()
    .min(6, "Mật khẩu cần ít nhất 6 ký tự")
    .max(100, "Mật khẩu quá dài"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }
  const { username, password } = parsed.data;

  // Friendly pre-check so a taken ID returns a clear message (the unique index
  // is still the source of truth — P2002 below covers the race).
  const taken = await prisma.user.findFirst({
    where: { username, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: "ID này đã có người dùng. Hãy chọn ID khác." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { username, passwordHash },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "ID này đã có người dùng. Hãy chọn ID khác." }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, username });
}
