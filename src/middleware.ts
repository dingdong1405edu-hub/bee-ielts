import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PROTECTED = ["/dashboard", "/vocab", "/grammar", "/reading", "/listening", "/writing", "/speaking", "/admin", "/teacher", "/parent", "/classes", "/welcome"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  // The /admin role gate lives in the admin layout (Node runtime) instead
  // of here — middleware runs on the Edge and can't query Prisma to get
  // the user's CURRENT role from DB. If we trusted the JWT role here, a
  // freshly-promoted admin would be bounced back to /dashboard until
  // their token re-issues (up to 30 days). Letting them through to the
  // layout, which validates against the DB, keeps the UX immediate.
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
