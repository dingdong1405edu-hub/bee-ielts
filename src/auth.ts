import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/admin";
import { authConfig } from "./auth.config";

/**
 * Auth.js (NextAuth v5) — Google is the ONLY sign-in method. There is no
 * email/password path. JWT session strategy (no adapter tables): on Google
 * sign-in we upsert the user into our own User table by email, then the jwt
 * callback resolves our DB id + role onto the token.
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
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Provision our User row from the Google profile. Runs before jwt(), so by
    // the time the token is minted the DB row (with our cuid + role) exists.
    signIn: async ({ user, account, profile }) => {
      // Google is the only provider, but assert it and reject unverified
      // emails before any upsert/owner promotion — owner identity is email-only,
      // so this callback must never trust an unverified address.
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
          // OWNER/ADMIN are never touched.
          if (
            fresh.role === "LEARNER" &&
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
