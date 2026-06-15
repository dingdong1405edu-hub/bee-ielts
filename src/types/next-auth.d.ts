import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "LEARNER" | "ADMIN" | "OWNER";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "LEARNER" | "ADMIN" | "OWNER";
    roleSyncedAt?: number;
  }
}
