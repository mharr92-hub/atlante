import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { slugLabels } from "@/lib/labels";
import { partnerDirectory } from "@/lib/partners";
import { monthBounds, summarizeCommissions, summarizePartnerCommissions } from "@/lib/commissions";
import { csvDocument, csvHeaders } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = ["mes", "producto_slug", "producto", "leads_pagados", "monto", "pct_efectivo", "comision"];

const PARTNER_COLUMNS = [
  "mes",
  "aliado_codigo",
  "aliado",
  "leads_pagados",
  "monto",
  "comision_atlante",
  "pct_aliado",
  "parte_aliado",
  "neto_atlante",
];

/**
 * Mismo agrupado que las tablas de `/admin/comisiones`, para pegar en Sheets.
 * `?group=aliado` devuelve el reparto por aliado (bloque 5.1); sin `group`, el
 * agrupado por producto o nave de siempre.
 */
export async function GET(request: Request) {
  await requireAdmin();

  const db = getDb();
  if (!db) return new Response("Sin base de datos", { status: 503 });

  const params = new URL(request.url).searchParams;
  const range = monthBounds(params.get("month") ?? undefined);
  const byPartner = params.get("group") === "aliado";

  let csv: string;
  try {
    const leads = await db.lead.findMany({
      where: { status: "paid", paidAt: { gte: range.from, lt: range.to } },
      select: {
        productSlug: true,
        vesselSlug: true,
        amount: true,
        commissionAmount: true,
        partnerCode: true,
      },
      take: 5000,
    });

    const paid = leads.map((lead) => ({
      productSlug: lead.productSlug,
      vesselSlug: lead.vesselSlug,
      amount: Number(lead.amount ?? 0),
      commissionAmount: Number(lead.commissionAmount ?? 0),
      partnerCode: lead.partnerCode,
    }));

    if (byPartner) {
      const partners = await partnerDirectory();
      const { rows, total } = summarizePartnerCommissions(paid, (code) => {
        const found = partners.get(code);
        return found ? { name: found.name, commissionPercent: found.commissionPercent } : null;
      });

      csv = csvDocument(
        PARTNER_COLUMNS,
        [...rows, total].map((row) => [
          range.month,
          row.code,
          row.label,
          row.leads,
          row.amount,
          row.commission,
          row.partnerPct ?? "",
          row.partnerShare ?? "",
          row.net ?? "",
        ]),
      );
    } else {
      const label = await slugLabels();
      const { rows, total } = summarizeCommissions(paid, label);

      csv = csvDocument(
        COLUMNS,
        [...rows, total].map((row) => [
          range.month,
          row.slug,
          row.label,
          row.leads,
          row.amount,
          row.effectivePct ?? "",
          row.commission,
        ]),
      );
    }
  } catch {
    return new Response("No se pudo leer la base de datos", { status: 503 });
  }

  return new Response(
    csv,
    { headers: csvHeaders(`comisiones${byPartner ? "-aliados" : ""}-${range.month}`) },
  );
}
