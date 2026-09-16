import { NextResponse } from "next/server";
import {
  attachPagueloFacilLink,
  createCharterLead,
} from "@/lib/charter-requests";
import {
  createPagueloFacilLink,
  getPagueloFacilAvailability,
} from "@/lib/paguelofacil";
import { L } from "@/lib/i18n";
import { getLiveCharter, getDuration } from "@/data/charters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Capture the charter lead, then (when configured) create a PagueloFácil
 * Enlace de Pago for the 30% deposit and return the hosted checkout URL.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug ?? "");
    const durationId = String(body.durationId ?? "");
    const date = String(body.date ?? "");
    const guests = Number(body.guests) || 1;
    const name = String(body.name ?? "");
    const whatsapp = String(body.whatsapp ?? "");

    const lead = await createCharterLead({
      slug,
      durationId,
      date,
      guests,
      name,
      whatsapp,
    });

    const charter = getLiveCharter(lead.slug);
    const duration = charter ? getDuration(charter, lead.durationId) : undefined;
    const pf = getPagueloFacilAvailability();

    // Do not create a hosted link we cannot reconcile (PARM_1 = lead.id).
    if (
      !pf.available ||
      !lead.persisted ||
      lead.depositAmount < 1 ||
      lead.sampleTotalUsd == null
    ) {
      return NextResponse.json({
        ok: true,
        id: lead.id,
        token: lead.token,
        checkoutUrl: null,
        graciasUrl: `/reservar/${lead.slug}/gracias?token=${encodeURIComponent(lead.token)}&pago=pendiente`,
        depositAmount: lead.depositAmount,
        paguelofacil: pf.available,
        pricesAreSample: true,
      });
    }

    const boatName = charter ? L(charter.name, "es") : lead.slug;
    const hoursLabel = duration ? L(duration.label, "es") : `${lead.hours}h`;
    const description = `Abono 30% ${boatName} ${hoursLabel} ${lead.date}`.slice(0, 150);

    try {
      const link = await createPagueloFacilLink({
        amountUsd: lead.depositAmount,
        description,
        parm1: lead.id,
      });
      await attachPagueloFacilLink(lead.id, link.code);
      return NextResponse.json({
        ok: true,
        id: lead.id,
        token: lead.token,
        checkoutUrl: link.url,
        graciasUrl: `/reservar/${lead.slug}/gracias?token=${encodeURIComponent(lead.token)}`,
        depositAmount: lead.depositAmount,
        paguelofacil: true,
        pricesAreSample: true,
      });
    } catch (err) {
      console.error("[charter-reservar] paguelofacil link failed", err);
      return NextResponse.json({
        ok: true,
        id: lead.id,
        token: lead.token,
        checkoutUrl: null,
        graciasUrl: `/reservar/${lead.slug}/gracias?token=${encodeURIComponent(lead.token)}&pago=pendiente`,
        depositAmount: lead.depositAmount,
        paguelofacil: false,
        error: "paguelofacil_link_failed",
        pricesAreSample: true,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    const clientErrors = new Set([
      "unknown_charter",
      "unknown_duration",
      "bad_name",
      "bad_whatsapp",
      "bad_date",
      "date_in_past",
    ]);
    const status = clientErrors.has(msg) ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
