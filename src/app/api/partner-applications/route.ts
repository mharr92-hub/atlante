import { NextResponse } from "next/server";
import { LeadValidationError } from "@/lib/leads";
import {
  createPartnerApplication,
  parsePartnerApplication,
} from "@/lib/partner-applications";
import { allow, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `/aliados/registro` (bloque 4.2): alta self-service de operadores, hoteles y
 * agencias. Queda en `PartnerApplication` con estado `new` para que Mark la
 * revise en `/admin/aliados`.
 *
 * Rate-limit más estrecho que el de leads: son 5 por minuto por IP; un alta de
 * aliado no se repite diez veces seguidas.
 */
export async function POST(request: Request) {
  if (!allow(`partners:${clientIp(request)}`, 5)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  try {
    const input = parsePartnerApplication(body);
    const { saved } = await createPartnerApplication(input);
    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    if (error instanceof LeadValidationError) {
      return NextResponse.json(
        { ok: false, error: "invalid", field: error.field, message: error.message },
        { status: 400 },
      );
    }
    console.error("[aliados] error inesperado al guardar la solicitud");
    return NextResponse.json({ ok: false, error: "unexpected" }, { status: 400 });
  }
}
