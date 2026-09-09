import Link from "next/link";
import { getProducts, productLabels } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import {
  buildLeadWhere,
  LEAD_STATUSES as STATUSES,
  LEAD_TYPES as TYPES,
  type LeadSearch as Search,
} from "@/lib/lead-filters";
import {
  markLeadLostAction,
  markLeadPaidAction,
  saveLeadNoteAction,
} from "@/app/admin/lead-actions";

/** Plantilla de rescate del abandono (PRD 5.2). */
function rescueUrl(
  lead: {
    phone: string;
    name: string;
    productSlug: string | null;
    vesselSlug: string | null;
    serviceDate: Date | null;
    destinationUrl: string | null;
  },
  label: (slug: string) => string,
): string {
  const slug = lead.productSlug ?? lead.vesselSlug;
  const product = slug ? label(slug) : "tu experiencia";
  const date = lead.serviceDate ? lead.serviceDate.toISOString().slice(0, 10) : "tu fecha";
  const text =
    `Hola ${lead.name}, soy del equipo de Atlante del Pacífico. ` +
    `Vi que empezaste tu reserva de ${product} para el ${date}. ` +
    `¿Te ayudo a completarla?` +
    (lead.destinationUrl ? ` Enlace directo: ${lead.destinationUrl}` : "");
  return `https://wa.me/${lead.phone.replace(/\D+/g, "")}?text=${encodeURIComponent(text)}`;
}

export default async function AdminLeads({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const db = getDb();

  if (!db) {
    return (
      <div>
        <h1 className="admin-h1">Leads</h1>
        <div className="admin-panel">
          <p className="admin-empty">
            Sin base de datos: falta <code>DATABASE_URL</code>. Los leads no se están guardando.
          </p>
        </div>
      </div>
    );
  }

  const [products, label] = await Promise.all([getProducts(), productLabels()]);

  let leads: Awaited<ReturnType<typeof db.lead.findMany>> = [];
  let failed = false;
  try {
    leads = await db.lead.findMany({
      where: buildLeadWhere(search),
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    failed = true;
  }

  const exportQuery = new URLSearchParams(
    Object.entries(search).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();

  return (
    <div>
      <h1 className="admin-h1">Leads</h1>

      <div className="admin-panel">
        <form className="admin-filters" method="get">
          <label>
            Estado
            <select name="status" defaultValue={search.status ?? ""}>
              <option value="">Todos</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select name="type" defaultValue={search.type ?? ""}>
              <option value="">Todos</option>
              {TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Producto
            <select name="productSlug" defaultValue={search.productSlug ?? ""}>
              <option value="">Todos</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name.es}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input type="date" name="from" defaultValue={search.from ?? ""} />
          </label>
          <label>
            Hasta
            <input type="date" name="to" defaultValue={search.to ?? ""} />
          </label>
          <label>
            Aliado
            <input type="text" name="partnerCode" defaultValue={search.partnerCode ?? ""} />
          </label>
          <button className="btn-sm btn-confirm" type="submit">
            Filtrar
          </button>
          <Link className="btn-sm" href={`/admin/leads/export${exportQuery ? `?${exportQuery}` : ""}`}>
            Exportar CSV
          </Link>
        </form>
      </div>

      <div className="admin-panel">
        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : leads.length === 0 ? (
          <p className="admin-empty">No hay leads con esos filtros.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Fecha de servicio</th>
                  <th>Pax</th>
                  <th>Estado</th>
                  <th>Monto / comisión</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.createdAt.toISOString().slice(0, 10)}</td>
                    <td>
                      {lead.name}
                      <br />
                      <span className="admin-muted">
                        {lead.phone || "—"}
                        <br />
                        {lead.email || "—"}
                      </span>
                    </td>
                    <td>
                      {lead.productSlug ?? lead.vesselSlug
                        ? label((lead.productSlug ?? lead.vesselSlug) as string)
                        : "—"}
                      {lead.partnerCode ? (
                        <>
                          <br />
                          <span className="admin-muted">aliado: {lead.partnerCode}</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {lead.serviceDate ? lead.serviceDate.toISOString().slice(0, 10) : "—"}
                      {lead.timeSlot ? ` · ${lead.timeSlot}` : ""}
                    </td>
                    <td>{lead.paxTotal ?? "—"}</td>
                    <td>
                      <span className={`pill pill-${lead.status}`}>{lead.status}</span>
                    </td>
                    <td>
                      {lead.amount ? money(Number(lead.amount)) : "—"}
                      <br />
                      <span className="admin-muted">
                        {lead.commissionAmount ? money(Number(lead.commissionAmount)) : "—"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {lead.phone ? (
                          <a
                            className="btn-sm btn-confirm"
                            href={rescueUrl(lead, label)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            WhatsApp
                          </a>
                        ) : null}

                        <form action={markLeadPaidAction}>
                          <input type="hidden" name="id" value={lead.id} />
                          <input
                            type="text"
                            name="pexBookingId"
                            placeholder="pex_booking_id"
                            defaultValue={lead.pexBookingId ?? ""}
                          />
                          <input
                            type="number"
                            name="amount"
                            step="0.01"
                            min="0"
                            placeholder="monto"
                            defaultValue={lead.amount ? String(lead.amount) : ""}
                            required
                          />
                          <button className="btn-sm btn-paid" type="submit">
                            Marcar pagado
                          </button>
                        </form>

                        <form action={markLeadLostAction}>
                          <input type="hidden" name="id" value={lead.id} />
                          <button className="btn-sm btn-cancel" type="submit">
                            Perdido
                          </button>
                        </form>

                        <form action={saveLeadNoteAction}>
                          <input type="hidden" name="id" value={lead.id} />
                          <input
                            type="text"
                            name="notes"
                            placeholder="Nota"
                            defaultValue={lead.notes ?? ""}
                          />
                          <button className="btn-sm" type="submit">
                            Guardar nota
                          </button>
                        </form>
                      </div>
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
