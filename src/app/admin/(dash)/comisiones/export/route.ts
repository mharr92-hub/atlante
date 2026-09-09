import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { productLabels } from "@/lib/catalog";
import { monthBounds, summarizeCommissions } from "@/lib/commissions";
import { csvDocument, csvHeaders } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = ["mes", "producto_slug", "producto", "leads_pagados", "monto", "pct_efectivo", "comision"];

/** Mismo agrupado que la tabla de `/admin/comisiones`, para pegar en Sheets. */
export async function GET(request: Request) {
  await requireAdmin();

  const db = getDb();
  if (!db) return new Response("Sin base de datos", { status: 503 });

  const range = monthBounds(new URL(request.url).searchParams.get("month") ?? undefined);

  let csv: string;
  try {
    const label = await productLabels();
    const leads = await db.lead.findMany({
      where: { status: "paid", paidAt: { gte: range.from, lt: range.to } },
      select: { productSlug: true, vesselSlug: true, amount: true, commissionAmount: true },
      take: 5000,
    });

    const { rows, total } = summarizeCommissions(
      leads.map((lead) => ({
        productSlug: lead.productSlug,
        vesselSlug: lead.vesselSlug,
        amount: Number(lead.amount ?? 0),
        commissionAmount: Number(lead.commissionAmount ?? 0),
      })),
      label,
    );

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
  } catch {
    return new Response("No se pudo leer la base de datos", { status: 503 });
  }

  return new Response(csv, { headers: csvHeaders(`comisiones-${range.month}`) });
}
