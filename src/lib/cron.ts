/**
 * Autorización de las rutas de cron (`/api/cron/*`).
 *
 * Vercel Cron llama la ruta con `Authorization: Bearer ${CRON_SECRET}`. Sin la
 * variable la ruta no hace nada: responde 503 y el sitio sigue igual (el cron es
 * una mejora, no un requisito para navegar ni para el handoff).
 */
import "server-only";
import { timingSafeEqual } from "node:crypto";

export type CronAuth = { ok: true } | { ok: false; status: number; reason: string };

const PREFIX = "Bearer ";

function equals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function authorizeCron(request: Request): CronAuth {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return { ok: false, status: 503, reason: "cron_not_configured" };

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith(PREFIX)) return { ok: false, status: 401, reason: "unauthorized" };
  if (!equals(header.slice(PREFIX.length), secret)) {
    return { ok: false, status: 401, reason: "unauthorized" };
  }
  return { ok: true };
}
