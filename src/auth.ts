import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/admin";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        // Owner luôn được nâng lên ADMIN (kể cả lần đăng nhập đầu).
        const owner = isOwner(user.email);
        if (owner && user.role !== "ADMIN") {
          await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: owner ? "ADMIN" : user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Server-side jwt callback (Node runtime only). The edge-safe variant
    // in auth.config.ts can't query Prisma, so it only copies role from
    // the sign-in payload — that's why a freshly-promoted admin was stuck
    // with a stale LEARNER role until they logged out and back in.
    //
    // Here we refresh role from the DB whenever auth() is called on the
    // server: re-issued tokens propagate immediately to every protected
    // route (admin pages, admin APIs, sidebar gate). The lookup is cached
    // on `roleSyncedAt` so we don't hammer the DB on bursty traffic —
    // 30 s is plenty fresh for an authoring app.
    jwt: async ({ token, user }) => {
      // Sign-in path: copy id+role from credentials authorize() return.
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        (token as { roleSyncedAt?: number }).roleSyncedAt = Date.now();
        return token;
      }
      // Subsequent request: refresh role from DB if cache is stale.
      const id = token.id as string | undefined;
      if (!id) return token;
      const lastSync = (token as { roleSyncedAt?: number }).roleSyncedAt ?? 0;
      if (Date.now() - lastSync > 30_000) {
        const fresh = await prisma.user.findUnique({
          where: { id },
          select: { role: true },
        });
        if (fresh) {
          token.role = fresh.role;
          (token as { roleSyncedAt?: number }).roleSyncedAt = Date.now();
        }
      }
      return token;
    },
  },
});
