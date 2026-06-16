import { PrismaClient } from "@prisma/client";

/**
 * Pin the Prisma connection pool so a single web instance can't exhaust
 * Postgres under concurrent load. By default Prisma sizes the pool at
 * `num_cpus * 2 + 1` — on a multi-core host (Railway containers often report
 * the host's core count) that can open far more sockets than Postgres allows,
 * and a burst of traffic then fails with "too many connections". We append a
 * fixed pool config to the connection string instead. All three are
 * overridable via env so ops can retune without a code change:
 *
 *  - connection_limit : max sockets Prisma keeps open to Postgres.
 *  - pool_timeout     : seconds a query waits for a free socket before erroring.
 *  - connect_timeout  : seconds allowed to establish a new socket.
 */
function tunedDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const setIfAbsent = (key: string, value: string) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    };
    setIfAbsent("connection_limit", process.env.DB_CONNECTION_LIMIT ?? "20");
    setIfAbsent("pool_timeout", process.env.DB_POOL_TIMEOUT ?? "20");
    setIfAbsent("connect_timeout", process.env.DB_CONNECT_TIMEOUT ?? "10");
    return url.toString();
  } catch {
    // Non-URL value (shouldn't happen) — let Prisma use it verbatim.
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  const url = tunedDatabaseUrl();
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

// Reuse a single client across the process (and across HMR reloads in dev) so
// we never stack multiple pools.
export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;
