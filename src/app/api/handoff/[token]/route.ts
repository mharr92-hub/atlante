import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ATLANTE_REF } from "@/lib/pex";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Prellenado del checkout de PEX sin datos personales en la URL (PRD 5.4).
 *
 * Servidor a servidor: PEX recibe `h=<token>` y lo canjea aquí con el secreto
 * compartido. El token es de un solo uso y vive 30 minutos. Nada de esto se
 * registra en logs (regla 7).
 */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.PEX_HANDOFF_SECRET ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!process.env.PEX_HANDOFF_SECRET) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  if (!allow(`handoff:${clientIp(request)}`, 60)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  if (!secretMatches(request.headers.get("x-atlante-key"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const { token } = await ctx.params;

  try {
    const handoff = await db.handoff.findUnique({
      where: { token },
      include: { lead: true },
    });

    if (!handoff || handoff.usedAt || handoff.expiresAt <= new Date()) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Un solo uso: se marca antes de responder.
    await db.handoff.update({ where: { token }, data: { usedAt: new Date() } });

    const lead = handoff.lead;
    return NextResponse.json({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      tickets: lead.paxTotal ?? undefined,
      pax: lead.pax ?? undefined,
      addons: lead.addons ?? [],
      referral_code: ATLANTE_REF,
      ref_id: lead.id,
    });
  } catch {
    console.error("[handoff] error al resolver el token");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
