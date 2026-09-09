/**
 * Lógica compartida del funnel de reserva: cuántos pasajeros, qué días se
 * pueden elegir y cuánto suma el estimado.
 *
 * Vive fuera de los componentes porque `POST /api/leads` recalcula el total en
 * el servidor a partir del catálogo — el cliente nunca manda precios.
 */
import type { Product, ProductAddon } from "@/content/catalog";

/** Cantidad de pasajeros por categoría de `priceTable` (`key` → cantidad). */
export type Pax = Record<string, number>;

/** Tope duro de pasajeros del funnel cuando el producto no declara capacidad. */
export const MAX_PAX = 20;

export function paxTotal(pax: Pax): number {
  return Object.values(pax).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}

/** Categorías de precio de un producto; siempre al menos una fila. */
export function priceRows(product: Product) {
  return (
    product.priceTable ?? [
      { key: "persona", label: product.name, price: product.priceFrom },
    ]
  );
}

export function minPax(product: Product): number {
  return product.capacityMin ?? 1;
}

export function maxPax(product: Product): number {
  return Math.min(product.capacityMax ?? MAX_PAX, Math.max(product.capacityMin ?? 0, MAX_PAX));
}

export function activeAddons(product: Product): ProductAddon[] {
  return (product.addons ?? []).filter((a) => a.active);
}

/**
 * Total estimado: Σ precio × cantidad + adicionales.
 * Los adicionales con unidad `pending` no suman: PEX no publica si se cobran
 * por persona o por reserva y no se inventa un número (regla 3).
 */
export function computeTotal(product: Product, pax: Pax, addonSlugs: string[] = []): number {
  const rows = priceRows(product);
  let total = 0;
  for (const row of rows) {
    const qty = Math.max(0, Math.trunc(pax[row.key] ?? 0));
    total += row.price * qty;
  }

  const people = paxTotal(pax);
  for (const addon of activeAddons(product)) {
    if (!addonSlugs.includes(addon.slug)) continue;
    if (addon.unit === "per_person") total += addon.price * people;
    else if (addon.unit === "per_booking") total += addon.price;
  }

  return Math.round(total * 100) / 100;
}

/** `pax=persona:2,nino-jubilado:1` ⇄ `{ persona: 2, "nino-jubilado": 1 }`. */
export function encodePax(pax: Pax): string {
  return Object.entries(pax)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${key}:${n}`)
    .join(",");
}

export function decodePax(raw: string | null | undefined, product: Product): Pax {
  const valid = new Set(priceRows(product).map((r) => r.key));
  const pax: Pax = {};
  for (const part of (raw ?? "").split(",")) {
    const [key, value] = part.split(":");
    if (!valid.has(key)) continue;
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) pax[key] = Math.min(n, MAX_PAX);
  }
  return pax;
}

/** Pasajeros por defecto: una unidad de la primera categoría, o el mínimo. */
export function defaultPax(product: Product): Pax {
  const first = priceRows(product)[0];
  return { [first.key]: Math.max(1, product.capacityMin ?? 1) };
}

// ---------------------------------------------------------------- fechas ----

/** `YYYY-MM-DD` de una fecha local, sin pasar por UTC. */
export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** `YYYY-MM-DD` → fecha local a medianoche (evita el corrimiento de zona). */
export function fromISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Primera fecha reservable: mañana como mínimo, y nunca antes del `validFrom`
 * que publica PEX.
 */
export function earliestDate(product: Product, today = new Date()): Date {
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const validFrom = product.schedule?.validFrom ? fromISODate(product.schedule.validFrom) : null;
  return validFrom && validFrom > tomorrow ? validFrom : tomorrow;
}

/** ¿Ese día tiene salida publicada y está dentro del rango reservable? */
export function isSelectableDate(product: Product, date: Date, today = new Date()): boolean {
  if (date < earliestDate(product, today)) return false;
  const weekdays = product.schedule?.weekdays;
  if (!weekdays || weekdays.length === 0) return true;
  return weekdays.includes(date.getDay());
}

/** La primera fecha con salida a partir de hoy (busca hasta un año). */
export function firstSelectableDate(product: Product, today = new Date()): Date {
  const start = earliestDate(product, today);
  for (let i = 0; i < 366; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (isSelectableDate(product, d, today)) return d;
  }
  return start;
}

/** Los horarios del producto, en formato "5:30 PM – 7:00 PM". */
export function slotLabel(slot: { start: string; end?: string }): string {
  return slot.end ? `${to12h(slot.start)} – ${to12h(slot.end)}` : to12h(slot.start);
}

export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** El ferry vende boleto abierto: no se elige hora. */
export function usesTimeSlots(product: Product): boolean {
  return product.kind !== "ferry" && (product.schedule?.times.length ?? 0) > 0;
}
