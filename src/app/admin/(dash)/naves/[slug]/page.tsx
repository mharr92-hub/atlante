import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { verificationIsStale } from "@/lib/catalog";
import { formatLocalizedLines } from "@/lib/catalog-forms";
import { getDb } from "@/lib/db";
import { rowToVessel } from "@/lib/vessels";
import {
  formatOnRequestItems,
  formatPricingRows,
  formatRoutes,
} from "@/lib/vessel-forms";
import {
  markVesselVerifiedTodayAction,
  saveVesselAction,
} from "@/app/admin/vessel-actions";

/**
 * Edición de una nave (bloque 4.3).
 *
 * Los campos JSON se editan como texto: la tabla de precios con una fila por
 * línea (`ruta | horas | capacidad | precio`), los extras bajo solicitud como
 * `etiqueta ES | etiqueta EN | precio | unidad`, y las listas bilingües en dos
 * textareas emparejadas por línea. El parseo vive en `lib/vessel-forms.ts`.
 */
const STALE_DAYS = 14;

type VesselRow = Prisma.VesselGetPayload<{ include: { operator: true } }>;
type OperatorRow = Prisma.OperatorGetPayload<object>;

function isoDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function loc(value: unknown, key: "es" | "en"): string {
  const v = (value ?? {}) as Record<string, unknown>;
  return typeof v[key] === "string" ? (v[key] as string) : "";
}

export default async function AdminNaveEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  if (!db) notFound();

  let row: VesselRow | null = null;
  let operators: OperatorRow[] = [];
  try {
    row = await db.vessel.findUnique({ where: { slug }, include: { operator: true } });
    operators = await db.operator.findMany({ orderBy: { slug: "asc" } });
  } catch {
    row = null;
  }
  if (!row) notFound();

  const vessel = rowToVessel(row);
  const verified = isoDay(row.verifiedAt);
  const stale = verificationIsStale(verified, STALE_DAYS);

  return (
    <div>
      <h1 className="admin-h1">{row.name}</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          <Link className="admin-link" href="/admin/naves">
            ← Volver a naves
          </Link>{" "}
          · <code>{row.slug}</code> · operador {row.operator.name} · cierre{" "}
          <code>{row.closeMode}</code>
          {stale ? (
            <>
              <br />
              <span className="admin-warn">
                Los datos no se verifican contra el operador desde hace más de {STALE_DAYS} días
                {verified ? ` (${verified})` : ""}.
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="admin-panel">
        <form action={markVesselVerifiedTodayAction} className="admin-filters">
          <input type="hidden" name="slug" value={row.slug} />
          <button className="btn-sm btn-confirm" type="submit">
            Marcar verificada hoy
          </button>
        </form>
      </div>

      <form action={saveVesselAction}>
        <input type="hidden" name="slug" value={row.slug} />

        <div className="admin-panel">
          <h2>Identidad</h2>
          <div className="admin-form-grid">
            <label>
              Nombre
              <input type="text" name="name" required defaultValue={row.name} />
            </label>
            <label>
              Operador
              <select name="operatorSlug" defaultValue={row.operator.slug}>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.slug}>
                    {operator.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo (clave: catamaran, ferry, no_publicado…)
              <input type="text" name="type" defaultValue={row.type} />
            </label>
            <label>
              Eslora (ft) — vacío si el operador no la publica
              <input
                type="number"
                name="lengthFt"
                min="1"
                max="1000"
                defaultValue={row.lengthFt === null ? "" : String(row.lengthFt)}
              />
            </label>
            <label>
              Capacidad máxima
              <input
                type="number"
                name="capacityMax"
                min="1"
                max="1000"
                required
                defaultValue={String(row.capacityMax)}
              />
            </label>
            <label>
              Marina de salida
              <input type="text" name="marina" defaultValue={row.marina} />
            </label>
            <label>
              Orden
              <input type="number" name="order" min="0" defaultValue={String(row.order)} />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Textos</h2>
          <div className="admin-form-grid">
            <label>
              Resumen (ES)
              <textarea name="summaryEs" rows={3} defaultValue={loc(row.summary, "es")} />
            </label>
            <label>
              Resumen (EN)
              <textarea name="summaryEn" rows={3} defaultValue={loc(row.summary, "en")} />
            </label>
            <label>
              Descripción (ES)
              <textarea name="descriptionEs" rows={6} defaultValue={loc(row.description, "es")} />
            </label>
            <label>
              Descripción (EN)
              <textarea name="descriptionEn" rows={6} defaultValue={loc(row.description, "en")} />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Precios y rutas</h2>
          <div className="admin-form-wide">
            <label>
              Tabla de precios — una fila por línea: <code>ruta | horas | capacidad | precio</code>
              <textarea
                name="pricing"
                rows={8}
                defaultValue={formatPricingRows(vessel.pricing)}
              />
            </label>
            <label>
              Rutas (claves separadas por coma: bahia, taboga, perlas)
              <input type="text" name="routes" defaultValue={formatRoutes(vessel.routes)} />
            </label>
          </div>
          <div className="admin-form-grid">
            <label>
              &quot;Desde $X por persona&quot; publicado por el operador (vacío = no se publica)
              <input
                type="number"
                name="pexPricePerPersonFrom"
                step="0.01"
                min="0"
                defaultValue={
                  row.pexPricePerPersonFrom === null
                    ? ""
                    : String(Number(row.pexPricePerPersonFrom))
                }
              />
            </label>
            <label>
              Apartado (%)
              <input
                type="number"
                name="depositPct"
                min="0"
                max="100"
                defaultValue={String(row.depositPct)}
              />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Incluye y bajo solicitud</h2>
          <div className="admin-form-grid">
            <label>
              Incluye (ES, una por línea)
              <textarea
                name="includesEs"
                rows={8}
                defaultValue={formatLocalizedLines(vessel.includes, "es")}
              />
            </label>
            <label>
              Incluye (EN, una por línea)
              <textarea
                name="includesEn"
                rows={8}
                defaultValue={formatLocalizedLines(vessel.includes, "en")}
              />
            </label>
          </div>
          <div className="admin-form-wide">
            <label>
              Bajo solicitud — una por línea:{" "}
              <code>etiqueta ES | etiqueta EN | precio | unidad</code> (unidad:{" "}
              <code>per_person</code>, <code>per_hour</code>, <code>per_booking</code>; sin precio
              se publica &quot;sin precio publicado&quot;)
              <textarea
                name="onRequest"
                rows={6}
                defaultValue={formatOnRequestItems(vessel.onRequest)}
              />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Políticas y galería</h2>
          <div className="admin-form-grid">
            <label>
              Cancelación (ES)
              <textarea
                name="cancellationEs"
                rows={3}
                defaultValue={loc(row.cancellationPolicy, "es")}
              />
            </label>
            <label>
              Cancelación (EN)
              <textarea
                name="cancellationEn"
                rows={3}
                defaultValue={loc(row.cancellationPolicy, "en")}
              />
            </label>
          </div>
          <div className="admin-form-wide">
            <label>
              Fotos (una ruta por línea)
              <textarea name="photos" rows={5} defaultValue={vessel.photos.join("\n")} />
            </label>
            <label>
              Vídeo (URL, opcional)
              <input type="text" name="video" defaultValue={row.video ?? ""} />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Cierre y verificación</h2>
          <div className="admin-form-grid">
            <label>
              Modo de cierre
              <select name="closeMode" defaultValue={row.closeMode}>
                <option value="quote">Cotizar (aliado)</option>
                <option value="deeplink">Reserva directa (Pacific Experience)</option>
              </select>
            </label>
            <label>
              Slug de la nave en el checkout del operador
              <input type="text" name="pexVesselSlug" defaultValue={row.pexVesselSlug ?? ""} />
            </label>
            <label>
              Ruta de la ficha en el sitio del operador
              <input type="text" name="pexPath" defaultValue={row.pexPath ?? ""} />
            </label>
            <label>
              Verificada el
              <input type="date" name="verifiedAt" defaultValue={verified} />
            </label>
            <label>
              URL de origen del dato
              <input type="text" name="sourceUrl" defaultValue={row.sourceUrl ?? ""} />
            </label>
          </div>
          <div className="admin-checks">
            <label>
              <input type="checkbox" name="active" defaultChecked={row.active} />
              Activa (visible en /charters)
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <button className="btn-sm btn-confirm" type="submit">
            Guardar nave
          </button>
        </div>
      </form>
    </div>
  );
}
