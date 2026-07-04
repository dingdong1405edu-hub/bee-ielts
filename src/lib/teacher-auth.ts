/**
 * Authorization guard for the Teacher/Classroom APIs.
 *
 * The app deliberately does NOT gate roles in the Edge `middleware.ts` (the
 * Edge runtime can't reach Prisma, so it would have to trust a possibly-stale
 * JWT role — a freshly-promoted teacher would be blocked until their token
 * re-issues). Instead this shared guard runs in the Node route handler and
 * checks the CURRENT role straight from the database. Every teacher endpoint
 * calls `requireTeacher()` first — it's the single choke-point for
 * "only TEACHER / ADMIN (OWNER) may manage classes & assignments".
 */
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export interface TeacherActor {
  id: string;
  role: Role;
}

/** Roles allowed to manage classes/assignments. OWNER is the super-admin and
 *  can do anything an ADMIN can. */
export function isTeacherOrAdmin(role: string | null | undefined): boolean {
  return role === "TEACHER" || role === "ADMIN" || role === "OWNER";
}

/** ADMIN/OWNER may manage ANY class; a plain TEACHER only their own. */
export function canManageAllClasses(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "OWNER";
}

/**
 * Resolve the caller and assert they may use the teacher APIs. Returns the
 * actor on success, or a ready-to-return NextResponse (401/403) on failure:
 *
 *   const gate = await requireTeacher();
 *   if (gate instanceof NextResponse) return gate;
 *   // gate is the authorised TeacherActor from here on
 */
export async function requireTeacher(): Promise<TeacherActor | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!me) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (!isTeacherOrAdmin(me.role)) {
    return NextResponse.json(
      { error: "Chỉ giáo viên hoặc admin mới được phép thực hiện thao tác này." },
      { status: 403 },
    );
  }
  return me;
}
