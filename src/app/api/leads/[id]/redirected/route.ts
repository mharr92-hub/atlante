import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * La pantalla `/listo` avisa que sí saltó a PEX. Es best-effort: se dispara con
 * `keepalive` mientras el navegador ya se está yendo, así que siempre responde
 * `{ ok: true }` y nunca bloquea nada.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!allow(`redirected:${clientIp(_request)}`, 60)) {
    return NextResponse.json({ ok: true });
  }

  const db = getDb();
  if (!db || !id) return NextResponse.json({ ok: true });

  try {
    await db.lead.updateMany({
      where: { id, status: "created" },
      data: { status: "redirected", redirectedAt: new Date() },
    });
  } catch {
    console.warn("[leads] no se pudo marcar el lead como redirigido");
  }

  return NextResponse.json({ ok: true });
}
