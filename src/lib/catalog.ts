/**
 * La única puerta de entrada al catálogo.
 *
 * Orden de preferencia (bloque 3.2):
 *   1. tabla `Product` de la base de datos, si hay `DATABASE_URL` y filas;
 *   2. `src/content/catalog.ts`, el catálogo en código del bloque 2.
 *
 * Las páginas públicas, el funnel y las APIs leen SÓLO de aquí: así el sitio
 * sigue en pie sin base de datos (regla 9) y el admin puede editar precios sin
 * un despliegue. `src/content/catalog.ts` queda como respaldo y como definición
 * de los tipos.
 */
import "server-only";
import type { Prisma } from "@prisma/client";
import {
  catalog as codeCatalog,
  type Badge,
  type Localized,
  type PriceRow,
  type PriceUnit,
  type Product,
  type ProductAddon,
  type ProductKind,
  type Schedule,
} from "@/content/catalog";
import { getDb } from "@/lib/db";
import type { SlotOption } from "@/lib/slots";

export type { Product, ProductAddon } from "@/content/catalog";

/** De dónde salió el catálogo que se está sirviendo. */
export type CatalogSource = "db" | "code";

export interface CatalogSnapshot {
  products: Product[];
  source: CatalogSource;
}

/**
 * Caché en proceso: una página puede pedir el catálogo varias veces por render
 * y no hace falta ir a Postgres cada vez. Corta también las tormentas de
 * consultas de las rutas dinámicas del admin.
 */
const CACHE_MS = 60_000;
let cached: { at: number; snapshot: CatalogSnapshot } | null = null;

/** Invalidar tras editar en `/admin/catalogo` o tras el cron de sincronización. */
export function clearCatalogCache(): void {
  cached = null;
}

// ------------------------------------------------------- mapeo desde la DB --

type Row = Prisma.ProductGetPayload<{ include: { addons: true } }>;

const KINDS: ProductKind[] = ["tour", "party", "ferry", "charter_pex"];
const UNITS: PriceUnit[] = ["per_person", "per_segment", "per_boat"];

function localized(value: unknown, fallback = ""): Localized {
  const v = (value ?? {}) as Record<string, unknown>;
  const es = typeof v.es === "string" ? v.es : fallback;
  const en = typeof v.en === "string" ? v.en : es;
  return { es, en };
}

function localizedList(value: unknown): Localized[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => localized(item));
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function numberOrUndefined(value: Prisma.Decimal | number | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  return Number(value);
}

function priceTable(value: unknown): PriceRow[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const rows: PriceRow[] = [];
  for (const raw of value) {
    const row = (raw ?? {}) as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key : null;
    const price = Number(row.price);
    if (!key || !Number.isFinite(price)) continue;
    rows.push({
      key,
      label: localized(row.label, key),
      price,
      ...(row.note ? { note: localized(row.note) } : {}),
    });
  }
  return rows.length > 0 ? rows : undefined;
}

function schedule(value: unknown): Schedule | undefined {
  if (!value || typeof value !== "object") return undefined;
  const s = value as Record<string, unknown>;
  const weekdays = Array.isArray(s.weekdays)
    ? s.weekdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    : [];
  const times = Array.isArray(s.times)
    ? s.times
        .map((raw) => {
          const time = (raw ?? {}) as Record<string, unknown>;
          const start = typeof time.start === "string" ? time.start : null;
          if (!start) return null;
          return typeof time.end === "string" ? { start, end: time.end } : { start };
        })
        .filter((t): t is { start: string; end?: string } => t !== null)
    : [];

  return {
    weekdays,
    times,
    ...(typeof s.validFrom === "string" ? { validFrom: s.validFrom } : {}),
    ...(s.note ? { note: localized(s.note) } : {}),
  };
}

function addons(rows: Row["addons"]): ProductAddon[] | undefined {
  if (rows.length === 0) return undefined;
  return [...rows]
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((addon) => ({
      slug: addon.slug,
      name: localized(addon.name, addon.slug),
      price: Number(addon.price),
      unit:
        addon.unit === "per_booking" || addon.unit === "pending" ? addon.unit : "per_person",
      ...(addon.durationMin !== null ? { durationMin: addon.durationMin } : {}),
      active: addon.active,
    }));
}

/** `Date` (columna `DATE`) → `YYYY-MM-DD` sin pasar por la zona horaria local. */
export function isoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/** Fila de `Product` → el mismo tipo `Product` que consume todo el sitio. */
export function rowToProduct(row: Row): Product {
  const kind = (KINDS as string[]).includes(row.kind) ? (row.kind as ProductKind) : "tour";
  const priceUnit = (UNITS as string[]).includes(row.priceUnit)
    ? (row.priceUnit as PriceUnit)
    : "per_person";

  const images = stringList(row.images);
  const badges = stringList(row.badges) as Badge[];

  return {
    slug: row.slug,
    kind,
    source: "pex",
    name: localized(row.name, row.slug),
    summary: localized(row.summary),
    description: localized(row.description),
    priceFrom: Number(row.priceFrom),
    priceUnit,
    ...(priceTable(row.priceTable) ? { priceTable: priceTable(row.priceTable) } : {}),
    ...(row.pricePerPersonFrom !== null
      ? { pricePerPersonFrom: Number(row.pricePerPersonFrom) }
      : {}),
    ...(row.durationMin !== null ? { durationMin: row.durationMin } : {}),
    durationLabel: localized(row.durationLabel),
    ...(schedule(row.schedule) ? { schedule: schedule(row.schedule) } : {}),
    ...(row.capacityMin !== null ? { capacityMin: row.capacityMin } : {}),
    ...(row.capacityMax !== null ? { capacityMax: row.capacityMax } : {}),
    includes: localizedList(row.includes),
    ...(localizedList(row.notIncluded).length > 0
      ? { notIncluded: localizedList(row.notIncluded) }
      : {}),
    policies: localizedList(row.policies),
    ...(addons(row.addons) ? { addons: addons(row.addons) } : {}),
    images: images.length > 0 ? images : ["/og-atlante.jpg"],
    pexPath: row.pexPath,
    ...(row.pexVessel
      ? { pexCheckout: { kind: "charter" as const, vessel: row.pexVessel } }
      : { pexCheckout: { kind: "tour" as const, tripId: row.pexTripId } }),
    available: row.available,
    verifiedAt: isoDate(row.verifiedAt),
    sourceUrl: row.sourceUrl ?? "",
    order: row.order,
    ...(badges.length > 0 ? { badges } : {}),
  };
}

// ------------------------------------------------------------------ lectura --

async function loadSnapshot(): Promise<CatalogSnapshot> {
  const db = getDb();
  if (!db) return { products: codeCatalog, source: "code" };

  try {
    const rows = await db.product.findMany({
      include: { addons: true },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
    });
    // Tabla vacía = catálogo aún sin sembrar: manda el catálogo en código.
    if (rows.length === 0) return { products: codeCatalog, source: "code" };
    return { products: rows.map(rowToProduct), source: "db" };
  } catch {
    // Sin detalles ni PII: la base no responde y el sitio sigue igual.
    console.warn("[catalog] sin base de datos; se sirve el catálogo en código");
    return { products: codeCatalog, source: "code" };
  }
}

export async function getCatalog(): Promise<CatalogSnapshot> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.snapshot;
  const snapshot = await loadSnapshot();
  cached = { at: Date.now(), snapshot };
  return snapshot;
}

export async function getProducts(): Promise<Product[]> {
  return (await getCatalog()).products;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  if (!slug) return undefined;
  return (await getProducts()).find((p) => p.slug === slug);
}

/** Ticketería: lo que se reserva por el funnel de 3 clics. */
export async function getTicketProducts(): Promise<Product[]> {
  return (await getProducts()).filter((p) => ["tour", "party", "ferry"].includes(p.kind));
}

/** Naves de PEX: enlazan a su checkout, sin funnel (hasta el bloque 4). */
export async function getVessels(): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.kind === "charter_pex");
}

export async function getCatalogSource(): Promise<CatalogSource> {
  return (await getCatalog()).source;
}

// -------------------------------------------------------------- salidas -----

export interface ProductSlots {
  slots: SlotOption[];
  /** El `syncedAt` más reciente del snapshot; `null` sin salidas. */
  syncedAt: Date | null;
}

const EMPTY_SLOTS: ProductSlots = { slots: [], syncedAt: null };

/**
 * Salidas sincronizadas del feed de PEX, de hoy en adelante.
 *
 * Devuelve la lista vacía sin base de datos, sin tabla o sin feed: el funnel lo
 * interpreta como modo puente y usa el calendario por `schedule`.
 */
export async function getProductSlots(slug: string, from = new Date()): Promise<ProductSlots> {
  const db = getDb();
  if (!db || !slug) return EMPTY_SLOTS;

  const floor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );

  try {
    const rows = await db.productSlot.findMany({
      where: { product: { slug }, date: { gte: floor } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 500,
    });
    if (rows.length === 0) return EMPTY_SLOTS;

    const slots: SlotOption[] = rows.map((row) => ({
      id: row.pexSlotId,
      date: isoDate(row.date),
      start: row.startTime,
      ...(row.endTime ? { end: row.endTime } : {}),
      capacityRemaining: row.capacityRemaining,
      ...(row.price !== null ? { price: Number(row.price) } : {}),
    }));

    const syncedAt = rows.reduce<Date>(
      (max, row) => (row.syncedAt > max ? row.syncedAt : max),
      rows[0].syncedAt,
    );

    return { slots, syncedAt };
  } catch {
    console.warn("[catalog] no se pudieron leer las salidas; modo puente");
    return EMPTY_SLOTS;
  }
}

/** `verifiedAt` con más de `days` días: aviso en `/admin/catalogo`. */
export function verificationIsStale(verifiedAt: string, days = 14, now = new Date()): boolean {
  if (!verifiedAt) return true;
  const parsed = Date.parse(`${verifiedAt}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return true;
  return now.getTime() - parsed > days * 24 * 60 * 60 * 1000;
}

/** Comisión efectiva de un producto: la suya, o `ATLANTE_COMMISSION_PCT`. */
export const COMMISSION_PCT_DEFAULT = 20;

export function defaultCommissionPct(): number {
  const raw = Number(process.env.ATLANTE_COMMISSION_PCT);
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : COMMISSION_PCT_DEFAULT;
}

/** Sin base de datos no hay `Product.commissionPct`: manda la variable. */
export function numberOrDefaultPct(value: Prisma.Decimal | number | null): number {
  const pct = numberOrUndefined(value);
  return pct === undefined ? defaultCommissionPct() : pct;
}
