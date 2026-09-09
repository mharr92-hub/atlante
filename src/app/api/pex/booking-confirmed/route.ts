import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { commissionPctFor, defaultCommissionPct } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import {
  commissionFor,
  isDuplicateEvent,
  isRevertEvent,
  parseWebhookBody,
  sha256,
  verifyWebhook,
  type WebhookBody,
} from "@/lib/pex-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de confirmación de Pacific Experience (PRD 5.5).
 *
 * PEX todavía no lo dispara (cambio X5 de su lado). Ya valida firma, ventana de
 * tiempo e idempotencia — todo eso vive en `lib/pex-webhook.ts`, probado sin
 * base de datos — para que cuando llegue el primer evento real no haya nada que
 * improvisar.
 *
 * Cuerpo esperado:
 *   { event, pex_booking_id, ref, ref_id, product, service_date, tickets,
 *     amount, currency, paid_at, customer_email_sha256 }
 * Sin datos de tarjeta y sin nombre: el correo llega hasheado.
 */
export async function POST(request: Request) {
  const secret = process.env.PEX_WEBHOOK_SECRET ?? "";
  const rawBody = await request.text();

  const check = verifyWebhook({
    timestamp: request.headers.get("x-pex-timestamp"),
    signature: request.headers.get("x-pex-signature"),
    rawBody,
    secret,
  });
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error }, { status: check.status });
  }

  const parsed = parseWebhookBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }
  const { body, event, bookingId } = parsed;

  const db = getDb();
  if (!db) return NextResponse.json({ ok: false, error: "no_database" }, { status: 503 });

  // Idempotencia: (pex_booking_id, event) es único. Un reenvío no duplica nada.
  try {
    await db.pexEvent.create({
      data: {
        pexBookingId: bookingId,
        eventType: event,
        payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
        signatureOk: true,
      },
    });
  } catch (error) {
    if (isDuplicateEvent(error)) return NextResponse.json({ ok: true, duplicate: true });
    console.error("[pex-webhook] no se pudo registrar el evento");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  try {
    if (event === "booking.paid") await handlePaid(db, body, bookingId);
    else if (isRevertEvent(event)) await handleReverted(db, body, bookingId);
  } catch {
    console.error("[pex-webhook] no se pudo aplicar el evento al lead");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

type Db = NonNullable<ReturnType<typeof getDb>>;

/** Busca el lead por `ref_id`; si no, por correo hasheado + fecha de servicio. */
async function findLead(db: Db, body: WebhookBody) {
  if (body.ref_id) {
    const byRef = await db.lead.findUnique({ where: { id: body.ref_id } });
    if (byRef) return byRef;
  }

  const hash = body.customer_email_sha256;
  if (!hash || !body.service_date) return null;

  const serviceDate = new Date(`${body.service_date}T00:00:00.000Z`);
  if (Number.isNaN(serviceDate.getTime())) return null;

  const candidates = await db.lead.findMany({
    where: { status: "redirected", serviceDate },
    take: 200,
  });
  return candidates.find((lead) => sha256(lead.email) === hash) ?? null;
}

async function handlePaid(db: Db, body: WebhookBody, bookingId: string) {
  const amount = Number(body.amount);
  const paidAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;

  const lead = await findLead(db, body);

  // La comisión del producto manda sobre `ATLANTE_COMMISSION_PCT`; un pago sin
  // lead no tiene producto conocido, así que se le aplica la global.
  const pct = lead
    ? await commissionPctFor(lead.productSlug ?? lead.vesselSlug)
    : defaultCommissionPct();
  const commissionAmount = commissionFor(paidAmount, pct);

  if (!lead) {
    // Pago sin lead: se registra para revisión manual, sin correo en claro.
    await db.lead.create({
      data: {
        type: "tour",
        name: "Pago sin lead (PEX)",
        email: "",
        phone: "",
        status: "paid_unmatched",
        pexBookingId: bookingId,
        amount: paidAmount,
        commissionPct: pct,
        commissionAmount,
        paidAt: new Date(),
        serviceDate: body.service_date ? new Date(`${body.service_date}T00:00:00.000Z`) : null,
        notes: [
          "Reserva pagada en PEX sin ref_id.",
          body.product?.name ? `Producto: ${body.product.name}` : null,
          body.customer_email_sha256 ? `email_sha256: ${body.customer_email_sha256}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      },
    });
    return;
  }

  await db.lead.update({
    where: { id: lead.id },
    data: {
      status: "paid",
      pexBookingId: bookingId,
      amount: paidAmount,
      commissionPct: pct,
      commissionAmount,
      paidAt: new Date(),
    },
  });
}

async function handleReverted(db: Db, body: WebhookBody, bookingId: string) {
  const lead = await findLead(db, body);
  if (!lead) return;

  await db.lead.update({
    where: { id: lead.id },
    data: {
      status: "lost",
      pexBookingId: bookingId,
      commissionAmount: 0,
      commissionPct: 0,
      paidAt: null,
    },
  });
}
