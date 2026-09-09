import Link from "next/link";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { slugLabels } from "@/lib/labels";
import {
  monthBounds,
  recentMonths,
  summarizeCommissions,
  type CommissionRow,
} from "@/lib/commissions";

/**
 * `/admin/comisiones` (bloque 3.4): por mes y por producto, cuántos leads se
 * pagaron, cuánto se cobró y cuánta comisión generó Atlante.
 *
 * El monto y la comisión salen del lead: los escribe el webhook de PEX o el
 * botón "Marcar pagado" del admin. Si PEX todavía no dispara el webhook (X5), la
 * tabla sólo trae lo que Mark concilió a mano — no se estima nada.
 */
export default async function AdminComisiones({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requested } = await searchParams;
  const range = monthBounds(requested);
  const db = getDb();

  if (!db) {
    return (
      <div>
        <h1 className="admin-h1">Comisiones</h1>
        <div className="admin-panel">
          <p className="admin-empty">
            Sin base de datos: falta <code>DATABASE_URL</code>. No hay leads pagados que reportar.
          </p>
        </div>
      </div>
    );
  }

  let rows: CommissionRow[] = [];
  let total: CommissionRow | null = null;
  let failed = false;

  try {
    const label = await slugLabels();
    const leads = await db.lead.findMany({
      where: { status: "paid", paidAt: { gte: range.from, lt: range.to } },
      select: {
        productSlug: true,
        vesselSlug: true,
        amount: true,
        commissionAmount: true,
      },
      take: 5000,
    });

    const summary = summarizeCommissions(
      leads.map((lead) => ({
        productSlug: lead.productSlug,
        vesselSlug: lead.vesselSlug,
        amount: Number(lead.amount ?? 0),
        commissionAmount: Number(lead.commissionAmount ?? 0),
      })),
      label,
    );
    rows = summary.rows;
    total = summary.total;
  } catch {
    failed = true;
  }

  return (
    <div>
      <h1 className="admin-h1">Comisiones</h1>

      <div className="admin-panel">
        <form className="admin-filters" method="get">
          <label>
            Mes
            <select name="month" defaultValue={range.month}>
              {recentMonths().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-sm btn-confirm" type="submit">
            Ver
          </button>
          <Link className="btn-sm" href={`/admin/comisiones/export?month=${range.month}`}>
            Exportar CSV
          </Link>
        </form>
      </div>

      <div className="admin-panel">
        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">
            No hay leads pagados en {range.month}. Un lead pasa a <code>paid</code> con el webhook
            de Pacific Experience o con el botón &quot;Marcar pagado&quot; de{" "}
            <Link className="admin-link" href="/admin/leads">
              Leads
            </Link>
            .
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto / nave</th>
                  <th>Leads pagados</th>
                  <th>Monto</th>
                  <th>% efectivo</th>
                  <th>Comisión</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.slug}>
                    <td>{row.label}</td>
                    <td>{row.leads}</td>
                    <td>{money(row.amount)}</td>
                    <td>{row.effectivePct === null ? "—" : `${row.effectivePct} %`}</td>
                    <td>{money(row.commission)}</td>
                  </tr>
                ))}
                {total ? (
                  <tr>
                    <td>
                      <strong>{total.label}</strong>
                    </td>
                    <td>
                      <strong>{total.leads}</strong>
                    </td>
                    <td>
                      <strong>{money(total.amount)}</strong>
                    </td>
                    <td>
                      <strong>
                        {total.effectivePct === null ? "—" : `${total.effectivePct} %`}
                      </strong>
                    </td>
                    <td>
                      <strong>{money(total.commission)}</strong>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
