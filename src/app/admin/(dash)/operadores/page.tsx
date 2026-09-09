import Link from "next/link";
import { defaultCommissionPct } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { getVesselSource, rowToOperator } from "@/lib/vessels";
import { operatorSealVisible } from "@/lib/vessel-pricing";
import { deleteOperatorAction, saveOperatorAction } from "@/app/admin/vessel-actions";

/**
 * `/admin/operadores` (bloque 4.3): quién opera y cobra cada nave.
 *
 * `commissionPct`, el contrato, la licencia AMP y el seguro son internos: sólo
 * se ven aquí. El sello "Operador verificado" del sitio público exige los tres
 * del checklist más la casilla de esta pantalla.
 */
function isoDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function AdminOperadores() {
  const db = getDb();
  const source = await getVesselSource();

  if (!db) {
    return (
      <div>
        <h1 className="admin-h1">Operadores</h1>
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

  let operators: Awaited<ReturnType<typeof db.operator.findMany>> = [];
  let counts = new Map<string, number>();
  let failed = false;
  try {
    const rows = await db.operator.findMany({
      orderBy: { slug: "asc" },
      include: { _count: { select: { vessels: true } } },
    });
    operators = rows;
    counts = new Map(rows.map((row) => [row.slug, row._count.vessels]));
  } catch {
    failed = true;
  }

  return (
    <div>
      <h1 className="admin-h1">Operadores</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          Fuente del marketplace: {source === "db" ? "base de datos" : "código"} · comisión por
          defecto {defaultCommissionPct()} %. El sello público sólo aparece con licencia AMP,
          seguro vigente, contrato firmado <em>y</em> la casilla &quot;verificado&quot;.
        </p>
      </div>

      <div className="admin-panel">
        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : operators.length === 0 ? (
          <p className="admin-empty">
            La tabla <code>Operator</code> está vacía. Corre <code>npm run db:seed</code> o crea uno
            abajo.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Operador</th>
                  <th>Contacto</th>
                  <th>Comisión</th>
                  <th>Checklist</th>
                  <th>Sello público</th>
                  <th>Naves</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((operator) => {
                  const seal = operatorSealVisible(rowToOperator(operator));
                  const vessels = counts.get(operator.slug) ?? 0;
                  return (
                    <tr key={operator.id}>
                      <td>
                        {operator.name}
                        <br />
                        <span className="admin-muted">{operator.slug}</span>
                      </td>
                      <td>
                        <span className="admin-muted">
                          {operator.whatsapp || "—"}
                          <br />
                          {operator.email || "—"}
                        </span>
                      </td>
                      <td>
                        {operator.commissionPct === null
                          ? `${defaultCommissionPct()} % (por defecto)`
                          : `${Number(operator.commissionPct)} %`}
                      </td>
                      <td>
                        <span className="admin-muted">
                          AMP: {operator.ampLicense || "—"}
                          <br />
                          Seguro: {isoDay(operator.insuranceUntil) || "—"}
                          <br />
                          Contrato: {isoDay(operator.contractSignedAt) || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`pill pill-${seal ? "paid" : "lost"}`}>
                          {seal ? "sí" : "no"}
                        </span>
                      </td>
                      <td>{vessels}</td>
                      <td>
                        <div className="admin-actions">
                          <Link
                            className="btn-sm btn-confirm"
                            href={`/admin/operadores/${operator.slug}`}
                          >
                            Editar
                          </Link>
                          {vessels === 0 ? (
                            <form action={deleteOperatorAction}>
                              <input type="hidden" name="slug" value={operator.slug} />
                              <button className="btn-sm btn-cancel" type="submit">
                                Eliminar
                              </button>
                            </form>
                          ) : (
                            <span className="admin-muted">con naves</span>
                          )}
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
        <h2>Nuevo operador</h2>
        <form action={saveOperatorAction}>
          <div className="admin-form-grid">
            <label>
              Slug
              <input type="text" name="slug" required placeholder="marina-x" />
            </label>
            <label>
              Nombre
              <input type="text" name="name" required />
            </label>
            <label>
              WhatsApp (sólo dígitos)
              <input type="text" name="whatsapp" inputMode="numeric" />
            </label>
            <label>
              Correo
              <input type="email" name="email" />
            </label>
            <label>
              Comisión (%) — vacío usa {defaultCommissionPct()} %
              <input type="number" name="commissionPct" step="0.01" min="0" max="100" />
            </label>
          </div>
          <div className="admin-checks">
            <label>
              <input type="checkbox" name="active" defaultChecked />
              Activo
            </label>
          </div>
          <button className="btn-sm btn-confirm" type="submit">
            Crear operador
          </button>
        </form>
      </div>
    </div>
  );
}
