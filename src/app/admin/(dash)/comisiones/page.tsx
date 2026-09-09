import Link from "next/link";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { slugLabels } from "@/lib/labels";
import { partnerDirectory } from "@/lib/partners";
import {
  monthBounds,
  recentMonths,
  summarizeCommissions,
  summarizePartnerCommissions,
  type CommissionRow,
  type PartnerCommissionRow,
} from "@/lib/commissions";

/**
 * `/admin/comisiones` (bloques 3.4 y 5.1): por mes, cuántos leads se pagaron,
 * cuánto se cobró, cuánta comisión generó Atlante y cómo se reparte con el
 * aliado que trajo el lead.
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
  let partnerRows: PartnerCommissionRow[] = [];
  let partnerTotal: PartnerCommissionRow | null = null;
  let unresolved = 0;
  let failed = false;

  try {
    const [label, partners] = await Promise.all([slugLabels(), partnerDirectory()]);
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

    const summary = summarizeCommissions(paid, label);
    rows = summary.rows;
    total = summary.total;

    const split = summarizePartnerCommissions(paid, (code) => {
      const found = partners.get(code);
      return found ? { name: found.name, commissionPercent: found.commissionPercent } : null;
    });
    partnerRows = split.rows;
    partnerTotal = split.total;
    unresolved = split.unresolved;
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
            CSV por producto
          </Link>
          <Link
            className="btn-sm"
            href={`/admin/comisiones/export?month=${range.month}&group=aliado`}
          >
            CSV por aliado
          </Link>
        </form>
      </div>

      <div className="admin-panel">
        <h2>Por producto o nave</h2>
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

      <div className="admin-panel">
        <h2>Reparto por aliado</h2>
        <p className="admin-empty" style={{ marginTop: 0 }}>
          Comisión de Atlante = monto × % del producto (la que quedó guardada en el lead). Parte
          del aliado = monto × su porcentaje de{" "}
          <Link className="admin-link" href="/admin/aliados">
            Aliados
          </Link>
          . Los dos se calculan sobre el monto de la reserva, no uno sobre el otro.
        </p>

        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : partnerRows.length === 0 ? (
          <p className="admin-empty">No hay leads pagados en {range.month}.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Aliado</th>
                    <th>Leads pagados</th>
                    <th>Monto</th>
                    <th>Comisión Atlante</th>
                    <th>% aliado</th>
                    <th>Parte del aliado</th>
                    <th>Neto Atlante</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerRows.map((row) => (
                    <tr key={row.code || "(sin aliado)"}>
                      <td>
                        {row.label}
                        {row.code ? (
                          <>
                            <br />
                            <span className="admin-muted">{row.code}</span>
                          </>
                        ) : null}
                      </td>
                      <td>{row.leads}</td>
                      <td>{money(row.amount)}</td>
                      <td>{money(row.commission)}</td>
                      <td>{row.partnerPct === null ? "—" : `${row.partnerPct} %`}</td>
                      <td>{row.partnerShare === null ? "—" : money(row.partnerShare)}</td>
                      <td>{row.net === null ? "—" : money(row.net)}</td>
                    </tr>
                  ))}
                  {partnerTotal ? (
                    <tr>
                      <td>
                        <strong>{partnerTotal.label}</strong>
                      </td>
                      <td>
                        <strong>{partnerTotal.leads}</strong>
                      </td>
                      <td>
                        <strong>{money(partnerTotal.amount)}</strong>
                      </td>
                      <td>
                        <strong>{money(partnerTotal.commission)}</strong>
                      </td>
                      <td>—</td>
                      <td>
                        <strong>
                          {partnerTotal.partnerShare === null
                            ? "—"
                            : money(partnerTotal.partnerShare)}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {partnerTotal.net === null ? "—" : money(partnerTotal.net)}
                        </strong>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {unresolved > 0 ? (
              <p className="admin-warn">
                {unresolved} código(s) de aliado sin ficha activa en{" "}
                <Link className="admin-link" href="/admin/aliados">
                  Aliados
                </Link>
                : su reparto se muestra como &quot;—&quot; y no entra en los totales. Da de alta el
                código (o vuelve a activarlo) para poder repartir.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
