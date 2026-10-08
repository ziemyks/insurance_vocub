import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Connection settings for local Postgres and for Supabase behind Vercel functions.
 * - Serverless instances keep a small pool (DATABASE_POOL_MAX; default 3 on Vercel); point
 *   DATABASE_URL at Supabase's transaction pooler (port 6543).
 * - DATABASE_CA_CERT (PEM, "\n" escapes allowed) verifies the server certificate. Without it,
 *   the connection string's own sslmode applies.
 */
export function poolConfig(url: string, env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const max = Number(env.DATABASE_POOL_MAX) || (env.VERCEL ? 3 : 10);
  const ca = env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca) return { connectionString: url, max };
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("uselibpqcompat");
  return { connectionString: u.toString(), max, ssl: { ca, rejectUnauthorized: true } };
}

export function createPrismaClient(url = process.env.DATABASE_URL): PrismaClient {
  if (!url) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg(poolConfig(url)) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Shared client; reused across hot reloads and warm serverless invocations. Created on first use. */
export function db(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
