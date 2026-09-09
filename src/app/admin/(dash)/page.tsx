import Link from "next/link";
import type { Lead } from "@prisma/client";
import { getIntegrationStatus } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { productLabels } from "@/lib/catalog";

interface Summary {
  created: number;
  redirected: number;
  paid: number;
  amount: number;
  commission: number;
  recent: Lead[];
  label: (slug: string) => string;
}

/** Todo el acceso a datos ocurre aquí: el render nunca va dentro de try/catch. */
async function loadSummary(): Promise<Summary | null> {
  const db = getDb();
  if (!db) return null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const label = await productLabels();
    const [created, redirected, paid, agg, recent] = await Promise.all([
      db.lead.count({ where: { createdAt: { gte: monthStart } } }),
      db.lead.count({ where: { createdAt: { gte: monthStart }, redirectedAt: { not: null } } }),
      db.lead.count({ where: { createdAt: { gte: monthStart }, status: "paid" } }),
      db.lead.aggregate({
        _sum: { amount: true, commissionAmount: true },
        where: { status: "paid", paidAt: { gte: monthStart } },
      }),
      db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

    return {
      created,
      redirected,
      paid,
      amount: Number(agg._sum.amount ?? 0),
      commission: Number(agg._sum.commissionAmount ?? 0),
      recent,
      label,
    };
  } catch {
    return null;
  }
}

/** El modo nunca sale al sitio público: sólo se informa aquí (bloque 3.3). */
function ModeNotice({ mode, feed }: { mode: string; feed: boolean }) {
  return (
    <div className="admin-panel">
      <p className="admin-empty" style={{ margin: 0 }}>
        <strong>Modo: {mode}</strong> · <code>PEX_FEED_URL</code>{" "}
        {feed ? "configurado" : "sin configurar"}.{" "}
        {mode === "puente"
          ? "El funnel usa el horario del catálogo y la disponibilidad se confirma en Pacific Experience."
          : "El funnel muestra fechas y cupos reales del feed y enlaza al checkout con la salida elegida."}
      </p>
    </div>
  );
}

export default async function AdminHome() {
  const [summary, status] = await Promise.all([loadSummary(), getIntegrationStatus()]);

  if (!summary) {
    return (
      <div>
        <h1 className="admin-h1">Resumen</h1>
        <ModeNotice mode={status.mode} feed={status.feedConfigured} />
        <div className="admin-panel">
          <p className="admin-empty">
            No hay datos de leads: falta <code>DATABASE_URL</code> o la base no responde. El sitio
            público y el handoff a Pacific Experience funcionan igual, pero los leads no se están
            guardando.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-h1">Resumen del mes</h1>

      <ModeNotice mode={status.mode} feed={status.feedConfigured} />

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-num">{summary.created}</span>
          <span className="stat-label">Leads creados</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{summary.redirected}</span>
          <span className="stat-label">Redirigidos a PEX</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{summary.paid}</span>
          <span className="stat-label">Pagados</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{money(summary.amount)}</span>
          <span className="stat-label">Monto pagado</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{money(summary.commission)}</span>
          <span className="stat-label">Comisión acumulada</span>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Últimos leads</h2>
          <Link href="/admin/leads" className="admin-link">
            Ver todos →
          </Link>
        </div>
        {summary.recent.length === 0 ? (
          <p className="admin-empty">
            Aún no hay leads. Se crean cuando alguien completa el paso 3 del funnel.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Pax</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.createdAt.toISOString().slice(0, 10)}</td>
                    <td>{lead.name}</td>
                    <td>
                      {lead.productSlug ?? lead.vesselSlug
                        ? summary.label((lead.productSlug ?? lead.vesselSlug) as string)
                        : "—"}
                    </td>
                    <td>{lead.paxTotal ?? "—"}</td>
                    <td>
                      <span className={`pill pill-${lead.status}`}>{lead.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
