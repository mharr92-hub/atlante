/**
 * Prisma client singleton.
 *
 * Next.js dev + serverless (Vercel) re-instantiate modules on every hot reload /
 * lambda invocation, which would exhaust Postgres connections. We stash a single
 * client on `globalThis` so it is reused across reloads. Import `db` everywhere;
 * never call `new PrismaClient()` elsewhere.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
