import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildLeadWhere, type LeadSearch } from "@/lib/lead-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = [
  "id",
  "creado",
  "estado",
  "tipo",
  "producto",
  "nave",
  "fecha_servicio",
  "horario",
  "pax",
  "nombre",
  "whatsapp",
  "email",
  "aliado",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "pex_booking_id",
  "monto",
  "comision_pct",
  "comision",
  "redirigido",
  "pagado",
  "notas",
] as const;

/** Escapa un campo para CSV separado por comas. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Export para conciliar contra el reporte de PEX. Se abre en Excel y en Sheets:
 * UTF-8 con BOM (si no, los acentos salen rotos en Excel) y coma como
 * separador. Respeta los mismos filtros que la tabla.
 */
export async function GET(request: Request) {
  await requireAdmin();

  const db = getDb();
  if (!db) return new Response("Sin base de datos", { status: 503 });

  const url = new URL(request.url);
  const search: LeadSearch = {
    status: url.searchParams.get("status") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    productSlug: url.searchParams.get("productSlug") ?? undefined,
    partnerCode: url.searchParams.get("partnerCode") ?? undefined,
  };

  let leads;
  try {
    leads = await db.lead.findMany({
      where: buildLeadWhere(search),
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
  } catch {
    return new Response("No se pudo leer la base de datos", { status: 503 });
  }

  const rows = leads.map((lead) =>
    [
      lead.id,
      lead.createdAt,
      lead.status,
      lead.type,
      lead.productSlug,
      lead.vesselSlug,
      lead.serviceDate ? lead.serviceDate.toISOString().slice(0, 10) : "",
      lead.timeSlot,
      lead.paxTotal,
      lead.name,
      lead.phone,
      lead.email,
      lead.partnerCode,
      lead.utmSource,
      lead.utmMedium,
      lead.utmCampaign,
      lead.pexBookingId,
      lead.amount,
      lead.commissionPct,
      lead.commissionAmount,
      lead.redirectedAt,
      lead.paidAt,
      lead.notes,
    ]
      .map(cell)
      .join(","),
  );

  const csv = `﻿${COLUMNS.join(",")}\r\n${rows.join("\r\n")}\r\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="atlante-leads-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
