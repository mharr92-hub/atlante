import { NextResponse } from "next/server";
import { readAttribution } from "@/lib/attribution";
import { createLead, LeadValidationError, parseLeadInput } from "@/lib/leads";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paso 3 del funnel: guarda el lead, crea el handoff y devuelve la URL de PEX.
 *
 * Nunca responde 500 por culpa de la base de datos: si no hay DB, contesta con
 * `leadId: null` y una URL sin `ref_id`, para que el handoff siga (regla 9).
 */
export async function POST(request: Request) {
  if (!allow(`leads:${clientIp(request)}`, 20)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  try {
    const { input, product, slot } = await parseLeadInput(body);
    const attribution = await readAttribution();
    const result = await createLead(input, product, attribution, slot);

    return NextResponse.json({
      ok: true,
      leadId: result.leadId,
      handoffToken: result.handoffToken,
      destinationUrl: result.destinationUrl,
      total: result.total,
    });
  } catch (error) {
    if (error instanceof LeadValidationError) {
      return NextResponse.json(
        { ok: false, error: "invalid", field: error.field, message: error.message },
        { status: 400 },
      );
    }
    console.error("[leads] error inesperado al crear el lead");
    return NextResponse.json({ ok: false, error: "unexpected" }, { status: 400 });
  }
}
