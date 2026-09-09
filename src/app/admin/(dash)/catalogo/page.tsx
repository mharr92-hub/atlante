import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  defaultCommissionPct,
  getCatalogSource,
  getIntegrationStatus,
  verificationIsStale,
} from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { markVerifiedTodayAction } from "@/app/admin/catalog-actions";

/**
 * `/admin/catalogo` (bloque 3.5): lista de productos con su precio, su
 * disponibilidad, la fecha de verificación (con aviso a los 14 días) y su
 * comisión. La edición está en `/admin/catalogo/[slug]`.
 *
 * Aquí también se ve el modo de operación — "puente" o "integrado" — que nunca
 * aparece en el sitio público.
 */
const STALE_DAYS = 14;

type ProductRow = Prisma.ProductGetPayload<{
  include: { _count: { select: { addons: true; slots: true } } };
}>;

function isoDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function AdminCatalogo() {
  const db = getDb();
  const source = await getCatalogSource();
  const status = await getIntegrationStatus();
  const fallbackPct = defaultCommissionPct();

  if (!db) {
    return (
      <div>
        <h1 className="admin-h1">Catálogo</h1>
        <div className="admin-panel">
          <p className="admin-empty">
            Sin base de datos: el sitio se está sirviendo con el catálogo en código
            (<code>src/content/catalog.ts</code>) y no se puede editar desde aquí. Configura{" "}
            <code>DATABASE_URL</code> y corre <code>npm run db:seed</code>.
          </p>
        </div>
      </div>
    );
  }

  let products: ProductRow[] = [];
  let failed = false;
  try {
    products = await db.product.findMany({
      orderBy: [{ order: "asc" }, { slug: "asc" }],
      include: { _count: { select: { addons: true, slots: true } } },
    });
  } catch {
    failed = true;
  }

  const snapshots = new Map(status.snapshots.map((s) => [s.slug, s]));

  return (
    <div>
      <h1 className="admin-h1">Catálogo</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          <strong>Modo: {status.mode}</strong> · fuente del catálogo: {source === "db" ? "base de datos" : "código"} ·{" "}
          <code>PEX_FEED_URL</code> {status.feedConfigured ? "configurado" : "sin configurar"} ·
          comisión por defecto {fallbackPct} %.
          {status.mode === "puente"
            ? " Sin salidas sincronizadas el funnel usa el horario del catálogo y avisa que la disponibilidad se confirma en Pacific Experience."
            : " El funnel muestra fechas y cupos reales y enlaza al checkout con la salida elegida."}
        </p>
      </div>

      <div className="admin-panel">
        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : products.length === 0 ? (
          <p className="admin-empty">
            La tabla <code>Product</code> está vacía: el sitio usa el catálogo en código. Corre{" "}
            <code>npm run db:seed</code> para sembrarla.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Desde</th>
                  <th>Disponible</th>
                  <th>Verificado</th>
                  <th>Comisión</th>
                  <th>Salidas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const name = (product.name as { es?: string })?.es ?? product.slug;
                  const verified = isoDay(product.verifiedAt);
                  const stale = verificationIsStale(verified, STALE_DAYS);
                  const snapshot = snapshots.get(product.slug);
                  return (
                    <tr key={product.id}>
                      <td>
                        {name}
                        <br />
                        <span className="admin-muted">{product.slug}</span>
                      </td>
                      <td>{product.kind}</td>
                      <td>{money(Number(product.priceFrom))}</td>
                      <td>
                        <span className={`pill pill-${product.available ? "paid" : "lost"}`}>
                          {product.available ? "sí" : "no"}
                        </span>
                      </td>
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
                        {product.commissionPct === null
                          ? `${fallbackPct} % (por defecto)`
                          : `${Number(product.commissionPct)} %`}
                      </td>
                      <td>
                        {product._count.slots}
                        <br />
                        <span className="admin-muted">
                          {snapshot?.fresh ? "integrado" : "puente"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <Link className="btn-sm btn-confirm" href={`/admin/catalogo/${product.slug}`}>
                            Editar
                          </Link>
                          <form action={markVerifiedTodayAction}>
                            <input type="hidden" name="slug" value={product.slug} />
                            <button className="btn-sm" type="submit">
                              Marcar verificado hoy
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
    </div>
  );
}
