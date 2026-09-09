import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { verificationIsStale } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { getVesselSource, rowToVessel } from "@/lib/vessels";
import { cheapestRow } from "@/lib/vessel-pricing";
import { deleteVesselAction, saveVesselAction } from "@/app/admin/vessel-actions";

/**
 * `/admin/naves` (bloque 4.3): las fichas del marketplace.
 *
 * La lista muestra el tramo más barato publicado, el modo de cierre y la fecha
 * de verificación con aviso a los 14 días, igual que el catálogo. La edición
 * completa está en `/admin/naves/[slug]`.
 */
const STALE_DAYS = 14;

type VesselRow = Prisma.VesselGetPayload<{ include: { operator: true } }>;
type OperatorRow = Prisma.OperatorGetPayload<object>;

function isoDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function AdminNaves() {
  const db = getDb();
  const source = await getVesselSource();

  if (!db) {
    return (
      <div>
        <h1 className="admin-h1">Naves</h1>
        <div className="admin-panel">
          <p className="admin-empty">
            Sin base de datos: el marketplace se sirve con las naves en código
            (<code>src/content/vessels.ts</code>) y no se puede editar desde aquí. Configura{" "}
            <code>DATABASE_URL</code> y corre <code>npm run db:seed</code>.
          </p>
        </div>
      </div>
    );
  }

  let rows: VesselRow[] = [];
  let operators: OperatorRow[] = [];
  let failed = false;
  try {
    [rows, operators] = await Promise.all([
      db.vessel.findMany({
        include: { operator: true },
        orderBy: [{ order: "asc" }, { slug: "asc" }],
      }),
      db.operator.findMany({ orderBy: { slug: "asc" } }),
    ]);
  } catch {
    failed = true;
  }

  return (
    <div>
      <h1 className="admin-h1">Naves</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          Fuente del marketplace: {source === "db" ? "base de datos" : "código"}. El precio por
          persona que ve el cliente sale de la tabla de precios de cada nave: el tramo de capacidad
          que cubre a su grupo, dividido entre las personas.
        </p>
      </div>

      <div className="admin-panel">
        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">
            La tabla <code>Vessel</code> está vacía: el sitio usa las naves en código. Corre{" "}
            <code>npm run db:seed</code> para sembrarla.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nave</th>
                  <th>Operador</th>
                  <th>Tipo</th>
                  <th>Capacidad</th>
                  <th>Desde</th>
                  <th>Cierre</th>
                  <th>Verificada</th>
                  <th>Activa</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const vessel = rowToVessel(row);
                  const tier = cheapestRow(vessel);
                  const verified = isoDay(row.verifiedAt);
                  const stale = verificationIsStale(verified, STALE_DAYS);
                  return (
                    <tr key={row.id}>
                      <td>
                        {row.name}
                        <br />
                        <span className="admin-muted">{row.slug}</span>
                      </td>
                      <td>{row.operator.name}</td>
                      <td>{row.type}</td>
                      <td>{row.capacityMax}</td>
                      <td>
                        {tier ? (
                          <>
                            {money(tier.price)}
                            <br />
                            <span className="admin-muted">
                              {tier.route} · {tier.hours} h · {tier.capacityMax} pax
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{row.closeMode}</td>
                      <td>
                        {verified || "—"}
                        {stale ? (
                          <>
                            <br />
                            <span className="admin-warn">
                              sin verificar hace más de {STALE_DAYS} días
                            </span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <span className={`pill pill-${row.active ? "paid" : "lost"}`}>
                          {row.active ? "sí" : "no"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <Link className="btn-sm btn-confirm" href={`/admin/naves/${row.slug}`}>
                            Editar
                          </Link>
                          <form action={deleteVesselAction}>
                            <input type="hidden" name="slug" value={row.slug} />
                            <button className="btn-sm btn-cancel" type="submit">
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-panel">
        <h2>Nueva nave</h2>
        {operators.length === 0 ? (
          <p className="admin-empty">
            Primero crea un operador en <Link href="/admin/operadores">/admin/operadores</Link>.
          </p>
        ) : (
          <form action={saveVesselAction}>
            <div className="admin-form-grid">
              <label>
                Slug
                <input type="text" name="slug" required placeholder="nombre-de-la-nave" />
              </label>
              <label>
                Nombre
                <input type="text" name="name" required />
              </label>
              <label>
                Operador
                <select name="operatorSlug" required defaultValue={operators[0]?.slug}>
                  {operators.map((operator) => (
                    <option key={operator.id} value={operator.slug}>
                      {operator.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tipo (clave: catamaran, ferry, no_publicado…)
                <input type="text" name="type" defaultValue="no_publicado" />
              </label>
              <label>
                Capacidad máxima
                <input type="number" name="capacityMax" min="1" max="1000" required />
              </label>
              <label>
                Marina de salida
                <input type="text" name="marina" />
              </label>
              <label>
                Modo de cierre
                <select name="closeMode" defaultValue="quote">
                  <option value="quote">Cotizar (aliado)</option>
                  <option value="deeplink">Reserva directa (Pacific Experience)</option>
                </select>
              </label>
              <label>
                Apartado (%)
                <input type="number" name="depositPct" min="0" max="100" defaultValue="30" />
              </label>
            </div>
            <div className="admin-checks">
              <label>
                <input type="checkbox" name="active" defaultChecked />
                Activa (visible en /charters)
              </label>
            </div>
            <button className="btn-sm btn-confirm" type="submit">
              Crear nave
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
