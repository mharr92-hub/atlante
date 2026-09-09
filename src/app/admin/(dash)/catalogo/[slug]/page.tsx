import Link from "next/link";
import { notFound } from "next/navigation";
import type { Localized, PriceRow } from "@/content/catalog";
import { defaultCommissionPct, verificationIsStale } from "@/lib/catalog";
import { formatLocalizedLines, formatPriceTable, formatTimes } from "@/lib/catalog-forms";
import { getDb } from "@/lib/db";
import { WEEKDAYS_LONG } from "@/lib/i18n";
import { markVerifiedTodayAction, saveAddonAction, saveProductAction } from "@/app/admin/catalog-actions";

/**
 * Edición de un producto y sus adicionales (bloque 3.5).
 *
 * Los campos JSON del modelo se editan como texto: horarios en
 * `17:30-19:00, 20:00-21:30`, tabla de precios con una fila por línea
 * (`key | etiqueta ES | etiqueta EN | precio`) y las listas bilingües en dos
 * textareas emparejadas por línea. El parseo vive en `lib/catalog-forms.ts`.
 */
const STALE_DAYS = 14;
const PRICE_UNITS = [
  { value: "per_person", label: "por persona" },
  { value: "per_segment", label: "por tramo" },
  { value: "per_boat", label: "barco completo" },
];
const ADDON_UNITS = [
  { value: "per_person", label: "por persona" },
  { value: "per_booking", label: "por reserva" },
  { value: "pending", label: "por confirmar (no suma)" },
];

function loc(value: unknown, key: "es" | "en"): string {
  const v = (value ?? {}) as Record<string, unknown>;
  return typeof v[key] === "string" ? (v[key] as string) : "";
}

function locList(value: unknown): Localized[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({ es: loc(item, "es"), en: loc(item, "en") }));
}

function priceRows(value: unknown): PriceRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const price = Number(row.price);
    if (typeof row.key !== "string" || !Number.isFinite(price)) return [];
    return [{ key: row.key, label: { es: loc(row.label, "es"), en: loc(row.label, "en") }, price }];
  });
}

function isoDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function AdminCatalogoEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  if (!db) notFound();

  let product: Awaited<ReturnType<typeof db.product.findUnique>> = null;
  let addons: Awaited<ReturnType<typeof db.productAddon.findMany>> = [];
  try {
    product = await db.product.findUnique({ where: { slug } });
    if (product) {
      addons = await db.productAddon.findMany({
        where: { productId: product.id },
        orderBy: [{ order: "asc" }, { slug: "asc" }],
      });
    }
  } catch {
    product = null;
  }
  if (!product) notFound();

  const schedule = (product.schedule ?? {}) as {
    weekdays?: number[];
    times?: { start: string; end?: string }[];
    validFrom?: string;
    note?: unknown;
  };
  const weekdays = new Set(Array.isArray(schedule.weekdays) ? schedule.weekdays : []);
  const verified = isoDay(product.verifiedAt);
  const stale = verificationIsStale(verified, STALE_DAYS);

  return (
    <div>
      <h1 className="admin-h1">{loc(product.name, "es") || product.slug}</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          <Link className="admin-link" href="/admin/catalogo">
            ← Volver al catálogo
          </Link>{" "}
          · <code>{product.slug}</code> · {product.kind} · fuente <code>{product.source}</code>
          {product.syncedAt ? ` · sincronizado ${product.syncedAt.toISOString().slice(0, 16)}` : ""}
          {stale ? (
            <>
              <br />
              <span className="admin-warn">
                Los datos no se verifican contra Pacific Experience desde hace más de {STALE_DAYS}{" "}
                días{verified ? ` (${verified})` : ""}. Corre <code>npm run check:pex</code> y usa
                &quot;Marcar verificado hoy&quot;.
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="admin-panel">
        <form action={markVerifiedTodayAction} className="admin-filters">
          <input type="hidden" name="slug" value={product.slug} />
          <button className="btn-sm btn-confirm" type="submit">
            Marcar verificado hoy
          </button>
        </form>
      </div>

      <form action={saveProductAction}>
        <input type="hidden" name="slug" value={product.slug} />

        <div className="admin-panel">
          <h2>Textos</h2>
          <div className="admin-form-grid">
            <label>
              Nombre (ES)
              <input type="text" name="nameEs" defaultValue={loc(product.name, "es")} />
            </label>
            <label>
              Nombre (EN)
              <input type="text" name="nameEn" defaultValue={loc(product.name, "en")} />
            </label>
            <label>
              Resumen (ES)
              <textarea name="summaryEs" rows={3} defaultValue={loc(product.summary, "es")} />
            </label>
            <label>
              Resumen (EN)
              <textarea name="summaryEn" rows={3} defaultValue={loc(product.summary, "en")} />
            </label>
            <label>
              Descripción (ES)
              <textarea name="descriptionEs" rows={6} defaultValue={loc(product.description, "es")} />
            </label>
            <label>
              Descripción (EN)
              <textarea name="descriptionEn" rows={6} defaultValue={loc(product.description, "en")} />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Precio y capacidad</h2>
          <div className="admin-form-grid">
            <label>
              Precio desde (USD)
              <input
                type="number"
                name="priceFrom"
                step="0.01"
                min="0"
                required
                defaultValue={String(Number(product.priceFrom))}
              />
            </label>
            <label>
              Unidad
              <select name="priceUnit" defaultValue={product.priceUnit}>
                {PRICE_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Desde por persona (naves; vacío = no se publica)
              <input
                type="number"
                name="pricePerPersonFrom"
                step="0.01"
                min="0"
                defaultValue={
                  product.pricePerPersonFrom === null ? "" : String(Number(product.pricePerPersonFrom))
                }
              />
            </label>
            <label>
              Comisión de Atlante (%) — vacío usa {defaultCommissionPct()} %
              <input
                type="number"
                name="commissionPct"
                step="0.01"
                min="0"
                max="100"
                defaultValue={
                  product.commissionPct === null ? "" : String(Number(product.commissionPct))
                }
              />
            </label>
            <label>
              Capacidad mínima
              <input
                type="number"
                name="capacityMin"
                min="0"
                defaultValue={product.capacityMin ?? ""}
              />
            </label>
            <label>
              Capacidad máxima
              <input
                type="number"
                name="capacityMax"
                min="0"
                defaultValue={product.capacityMax ?? ""}
              />
            </label>
            <label className="admin-form-wide">
              Tabla de precios — una fila por línea: <code>key | etiqueta ES | etiqueta EN | precio</code>
              <textarea
                name="priceTable"
                rows={5}
                defaultValue={formatPriceTable(priceRows(product.priceTable))}
              />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Horario</h2>
          <div className="admin-form-grid">
            <fieldset className="admin-form-wide">
              <legend>Días de salida</legend>
              <div className="admin-checks">
                {WEEKDAYS_LONG.es.map((name, day) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={day}
                      defaultChecked={weekdays.has(day)}
                    />
                    {name}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Horarios — <code>17:30-19:00, 20:00-21:30</code>
              <input type="text" name="scheduleTimes" defaultValue={formatTimes(schedule.times)} />
            </label>
            <label>
              Primera fecha con salida
              <input
                type="date"
                name="scheduleValidFrom"
                defaultValue={schedule.validFrom ?? ""}
              />
            </label>
            <label>
              Nota del horario (ES)
              <textarea name="scheduleNoteEs" rows={2} defaultValue={loc(schedule.note, "es")} />
            </label>
            <label>
              Nota del horario (EN)
              <textarea name="scheduleNoteEn" rows={2} defaultValue={loc(schedule.note, "en")} />
            </label>
            <label>
              Duración (minutos)
              <input type="number" name="durationMin" min="0" defaultValue={product.durationMin ?? ""} />
            </label>
            <label>
              Duración visible (ES)
              <input type="text" name="durationLabelEs" defaultValue={loc(product.durationLabel, "es")} />
            </label>
            <label>
              Duración visible (EN)
              <input type="text" name="durationLabelEn" defaultValue={loc(product.durationLabel, "en")} />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Listas (una por línea, mismo orden en los dos idiomas)</h2>
          <div className="admin-form-grid">
            <label>
              Incluye (ES)
              <textarea
                name="includesEs"
                rows={5}
                defaultValue={formatLocalizedLines(locList(product.includes), "es")}
              />
            </label>
            <label>
              Incluye (EN)
              <textarea
                name="includesEn"
                rows={5}
                defaultValue={formatLocalizedLines(locList(product.includes), "en")}
              />
            </label>
            <label>
              No incluye (ES)
              <textarea
                name="notIncludedEs"
                rows={3}
                defaultValue={formatLocalizedLines(locList(product.notIncluded), "es")}
              />
            </label>
            <label>
              No incluye (EN)
              <textarea
                name="notIncludedEn"
                rows={3}
                defaultValue={formatLocalizedLines(locList(product.notIncluded), "en")}
              />
            </label>
            <label>
              Políticas del operador (ES)
              <textarea
                name="policiesEs"
                rows={4}
                defaultValue={formatLocalizedLines(locList(product.policies), "es")}
              />
            </label>
            <label>
              Políticas del operador (EN)
              <textarea
                name="policiesEn"
                rows={4}
                defaultValue={formatLocalizedLines(locList(product.policies), "en")}
              />
            </label>
            <label className="admin-form-wide">
              Imágenes (una ruta por línea)
              <textarea
                name="images"
                rows={3}
                defaultValue={(Array.isArray(product.images) ? product.images : [])
                  .filter((i): i is string => typeof i === "string")
                  .join("\n")}
              />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Publicación y fuente</h2>
          <div className="admin-form-grid">
            <label>
              <input type="checkbox" name="available" defaultChecked={product.available} /> Disponible
              (si no, no aparece en el sitio ni acepta reservas)
            </label>
            <label>
              Verificado el
              <input type="date" name="verifiedAt" defaultValue={verified} />
            </label>
            <label className="admin-form-wide">
              URL de origen en Pacific Experience (dato de procedencia, no un enlace del sitio)
              <input type="url" name="sourceUrl" defaultValue={product.sourceUrl ?? ""} />
            </label>
            <label>
              Orden
              <input type="number" name="order" min="0" defaultValue={product.order} />
            </label>
          </div>
          <div className="admin-actions" style={{ marginTop: 14 }}>
            <button className="btn-sm btn-paid" type="submit">
              Guardar producto
            </button>
          </div>
        </div>
      </form>

      <div className="admin-panel">
        <h2>Adicionales</h2>
        {addons.length === 0 ? (
          <p className="admin-empty">
            Este producto no tiene adicionales. Se crean en <code>src/content/catalog.ts</code> y
            entran con <code>npm run db:seed</code>.
          </p>
        ) : (
          addons.map((addon) => (
            <form action={saveAddonAction} key={addon.id} className="admin-form-grid admin-addon">
              <input type="hidden" name="id" value={addon.id} />
              <input type="hidden" name="productSlug" value={product.slug} />
              <label>
                Nombre (ES) — <code>{addon.slug}</code>
                <input type="text" name="nameEs" defaultValue={loc(addon.name, "es")} />
              </label>
              <label>
                Nombre (EN)
                <input type="text" name="nameEn" defaultValue={loc(addon.name, "en")} />
              </label>
              <label>
                Precio (USD)
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={String(Number(addon.price))}
                />
              </label>
              <label>
                Unidad
                <select name="unit" defaultValue={addon.unit}>
                  {ADDON_UNITS.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Duración (minutos)
                <input type="number" name="durationMin" min="0" defaultValue={addon.durationMin ?? ""} />
              </label>
              <label>
                <input type="checkbox" name="active" defaultChecked={addon.active} /> Activo
              </label>
              <div className="admin-actions admin-form-wide">
                <button className="btn-sm btn-paid" type="submit">
                  Guardar adicional
                </button>
              </div>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
