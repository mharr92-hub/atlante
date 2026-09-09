/**
 * Prisma client singleton — con degradación por diseño.
 *
 * Regla 9 del bloque: todo debe funcionar sin base de datos. Si `DATABASE_URL`
 * no existe (o el cliente no se puede construir), `getDb()` devuelve `null` y
 * el llamador sigue adelante: la navegación y el handoff a PEX nunca se
 * bloquean porque la DB falle.
 *
 * Next.js dev + serverless re-instancian los módulos en cada recarga / lambda,
 * lo que agotaría las conexiones de Postgres: el cliente se guarda en
 * `globalThis`. Importa `getDb()` en todos lados; nunca `new PrismaClient()`.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaFailed: boolean | undefined;
};

/** ¿Hay cadena de conexión configurada? */
export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** El cliente Prisma, o `null` si no hay base de datos disponible. */
export function getDb(): PrismaClient | null {
  if (!dbConfigured() || globalForPrisma.prismaFailed) return null;
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    globalForPrisma.prisma = client;
    return client;
  } catch {
    // Sin PII y sin detalles: sólo el hecho de que no hay DB.
    console.warn("[db] cliente Prisma no disponible; se sigue sin base de datos");
    globalForPrisma.prismaFailed = true;
    return null;
  }
}
