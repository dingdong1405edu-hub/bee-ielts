import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/admin";
import { verifyPassword, normalizeUsername } from "@/lib/password";
import { authConfig } from "./auth.config";

/**
 * Auth.js (NextAuth v5). Two sign-in methods:
 *  1. Google OAuth — the primary path; first sign-in auto-creates the account.
 *  2. Username + password (Credentials) — opt-in. A learner who has signed in
 *     with Google can set a login ID + password in their profile; afterwards
 *     they can sign in with that ID without Google. There is NO password-based
 *     *registration* — the account always originates from a Google sign-in.
 *
 * JWT session strategy (no adapter tables): on Google sign-in we upsert the
 * user into our own User table by email; the jwt callback resolves our DB id +
 * role onto the token (for both providers).
 *
 * Google OAuth credentials come from env (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET)
 * and the redirect URI to whitelist in Google Cloud Console is:
 *   <NEXT_PUBLIC_APP_URL>/api/auth/callback/google
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "ID & mật khẩu",
      credentials: {
        username: { label: "ID", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      // Runs in the Node runtime (this file backs /api/auth/*). Returns our own
      // user object on success or null on any failure — never throws, so we
      // don't leak whether the ID exists. The jwt callback below re-derives the
      // DB id + role from the email, same as the Google path.
      authorize: async (creds) => {
        const username = typeof creds?.username === "string" ? normalizeUsername(creds.username) : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!username || !password) return null;
        const user = await prisma.user.findUnique({
          where: { username },
          select: { id: true, email: true, name: true, passwordHash: true },
        });
        if (!user?.passwordHash) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        // Don't return `image`: our avatars are base64 data URLs and would bloat
        // the JWT past the cookie size limit. Avatar is read from the DB on the
        // pages that need it; the nav falls back to initials.
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Provision our User row from the Google profile. Runs before jwt(), so by
    // the time the token is minted the DB row (with our cuid + role) exists.
    signIn: async ({ user, account, profile }) => {
      // Credentials sign-in already proved identity in authorize() against a
      // row that only exists because of a prior Google sign-in — let it through
      // (no upsert needed; the row, and its owner role if any, already exist).
      if (account?.provider === "credentials") return true;
      // For Google: assert the provider and reject unverified emails before any
      // upsert/owner promotion — owner identity is email-only, so this callback
      // must never trust an unverified address.
      if (account?.provider !== "google") return false;
      if (profile && (profile as { email_verified?: boolean }).email_verified === false) {
        return false;
      }
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Owner is promoted to OWNER on every sign-in (idempotent): highest role,
      // auto-premium, the only account that can grant/revoke premium.
      const owner = isOwner(email);
      await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: user.name ?? undefined,
          avatarUrl: user.image ?? undefined,
          role: owner ? "OWNER" : "LEARNER",
          isPremium: owner,
        },
        // Don't clobber a learner's edited name/avatar on later logins; only
        // ever (re)assert the owner's role + premium.
        update: owner ? { role: "OWNER", isPremium: true } : {},
      });
      return true;
    },
    // Server-side jwt callback (Node runtime). Two jobs:
    //  1. Sign-in: Google's `user.id` is the provider sub, NOT our cuid — look
    //     up the DB row by email to stamp our real id + role onto the token.
    //  2. Subsequent requests: refresh role from DB (cached 30 s) so a freshly
    //     promoted admin propagates immediately, AND self-heal a lapsed timed
    //     premium so every isPremium-based gate locks again on expiry.
    jwt: async ({ token, user }) => {
      if (user) {
        const email = user.email?.toLowerCase();
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            (token as { roleSyncedAt?: number }).roleSyncedAt = Date.now();
          }
        }
        return token;
      }
      const id = token.id as string | undefined;
      if (!id) return token;
      const lastSync = (token as { roleSyncedAt?: number }).roleSyncedAt ?? 0;
      if (Date.now() - lastSync > 30_000) {
        const fresh = await prisma.user.findUnique({
          where: { id },
          select: { role: true, isPremium: true, premiumUntil: true },
        });
        if (fresh) {
          // Drop a lapsed paid plan back to free. Paid plans set isPremium=true
          // AND premiumUntil; permanent grants (premiumUntil=null) and
          // OWNER/ADMIN (premium by role) are never touched. Every other role
          // — LEARNER, STUDENT, TEACHER, PARENT — can hold a paid plan.
          if (
            fresh.role !== "OWNER" &&
            fresh.role !== "ADMIN" &&
            fresh.isPremium &&
            fresh.premiumUntil &&
            fresh.premiumUntil.getTime() < Date.now()
          ) {
            await prisma.user.update({
              where: { id },
              data: { isPremium: false, premiumUntil: null },
            });
          }
          token.role = fresh.role;
          (token as { roleSyncedAt?: number }).roleSyncedAt = Date.now();
        }
      }
      return token;
    },
  },
});
