/**
 * Traducción entre los campos JSON de `Vessel` y los controles de texto de
 * `/admin/naves` (bloque 4.3).
 *
 * Vive fuera de la página (y sin Prisma) para poder probarlo: una tabla de
 * precios mal parseada se lleva por delante el precio por persona de todo el
 * marketplace.
 *
 * Nada de esto inventa datos: la línea que no cumple el formato se descarta en
 * vez de guardarse a medias.
 */
import type { Localized } from "@/content/catalog";
import type { OnRequestItem, OnRequestUnit, PricingRow } from "@/content/vessels";
import { localized, slugifyKey } from "@/lib/catalog-forms";

const ON_REQUEST_UNITS: OnRequestUnit[] = ["per_person", "per_hour", "per_booking"];

function lines(raw: string): string[] {
  return (raw ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Tabla de precios, una fila por línea: `ruta | horas | capacidad | precio`.
 * Sin los cuatro valores la fila se descarta.
 */
export function parsePricingRows(raw: string): PricingRow[] {
  const rows: PricingRow[] = [];
  for (const line of lines(raw)) {
    const parts = line.split("|").map((part) => part.trim());
    const route = slugifyKey(parts[0] ?? "");
    const hours = Number(parts[1]);
    const capacityMax = Number(parts[2]);
    const price = Number(parts[3]);
    if (!route) continue;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) continue;
    if (!Number.isFinite(capacityMax) || capacityMax <= 0 || capacityMax > 1000) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    rows.push({
      route,
      hours: Math.trunc(hours),
      capacityMax: Math.trunc(capacityMax),
      price,
    });
  }
  return rows;
}

export function formatPricingRows(rows: PricingRow[] | undefined): string {
  return (rows ?? [])
    .map((row) => `${row.route} | ${row.hours} | ${row.capacityMax} | ${row.price}`)
    .join("\n");
}

/** "bahia, taboga, perlas" → `["bahia", "taboga", "perlas"]`, sin repetidos. */
export function parseRoutes(raw: string): string[] {
  const out: string[] = [];
  for (const chunk of (raw ?? "").split(/[,\n]/)) {
    const route = slugifyKey(chunk);
    if (route && !out.includes(route)) out.push(route);
  }
  return out;
}

export function formatRoutes(routes: string[] | undefined): string {
  return (routes ?? []).join(", ");
}

/**
 * Extras bajo solicitud, una línea por extra:
 * `etiqueta ES | etiqueta EN | precio | unidad`. El precio y la unidad son
 * opcionales: sin precio publicado la ficha dice "sin precio publicado".
 */
export function parseOnRequestItems(raw: string): OnRequestItem[] {
  const items: OnRequestItem[] = [];
  for (const line of lines(raw)) {
    const parts = line.split("|").map((part) => part.trim());
    const labelEs = parts[0];
    if (!labelEs) continue;

    const label: Localized = localized(labelEs, parts[1] ?? "");
    const price = Number(parts[2] ?? "");
    const unit = parts[3] ?? "";

    items.push({
      label,
      ...(Number.isFinite(price) && price > 0 ? { price } : {}),
      ...(ON_REQUEST_UNITS.includes(unit as OnRequestUnit)
        ? { unit: unit as OnRequestUnit }
        : {}),
    });
  }
  return items;
}

export function formatOnRequestItems(items: OnRequestItem[] | undefined): string {
  return (items ?? [])
    .map((item) =>
      [item.label.es, item.label.en, item.price ?? "", item.unit ?? ""].join(" | ").trimEnd(),
    )
    .join("\n");
}
