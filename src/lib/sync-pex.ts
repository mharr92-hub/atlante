/**
 * Sincronización feed de PEX → `Product` / `ProductSlot` (bloque 3.2).
 *
 * Este archivo no conoce Prisma: habla con una interfaz mínima (`SyncDb`) que
 * la ruta del cron implementa y los tests sustituyen por un doble. Así la
 * lógica de "qué se pisa y qué no" se puede probar sin base de datos.
 *
 * Regla del bloque: si el feed falla, el snapshot anterior queda intacto. Por
 * eso la escritura sólo empieza cuando `/trips` respondió bien, y las salidas
 * de un producto sólo se reemplazan si su `/slots` también respondió.
 */
import {
  fetchSlots,
  fetchTrips,
  PexFeedError,
  type FeedOptions,
  type PexSlot,
  type PexTrip,
  type PexTripKind,
} from "@/lib/pex-feed";

/** Ventana de salidas que se copia en cada corrida. */
export const SYNC_WINDOW_DAYS = 90;

export interface SyncProductRef {
  id: string;
  slug: string;
}

/** Campos que el feed posee y puede pisar en cada corrida. */
export interface ProductFeedFields {
  pexTripId: string;
  pexPath: string;
  priceFrom: number;
  priceTable: { key: string; label: { es: string; en: string }; price: number }[];
  durationMin: number | null;
  capacityMin: number | null;
  capacityMax: number | null;
  available: boolean;
  images: string[];
  syncedAt: Date;
  verifiedAt: Date;
}

/** Campos que sólo se escriben al crear el producto (Mark los edita luego). */
export interface ProductCreateFields extends ProductFeedFields {
  slug: string;
  kind: string;
  priceUnit: string;
  name: { es: string; en: string };
  summary: { es: string; en: string };
  description: { es: string; en: string };
  durationLabel: { es: string; en: string };
  policies: { es: string; en: string }[];
  sourceUrl: string | null;
}

export interface SlotFields {
  productId: string;
  pexSlotId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  capacityRemaining: number;
  price: number | null;
  syncedAt: Date;
}

export interface SyncDb {
  /** Producto ya existente para ese trip (por `pexTripId`, si no por `slug`). */
  findProduct(tripId: string, slug: string): Promise<SyncProductRef | null>;
  createProduct(data: ProductCreateFields): Promise<SyncProductRef>;
  updateProduct(id: string, data: ProductFeedFields): Promise<void>;
  upsertSlot(data: SlotFields): Promise<void>;
  /** Borra las salidas del producto dentro de la ventana que el feed ya no trae. */
  deleteStaleSlots(productId: string, from: string, to: string, keep: string[]): Promise<number>;
}

export interface SyncResult {
  ok: boolean;
  reason?: string;
  trips: number;
  products: number;
  slots: number;
  removed: number;
  /** Productos cuyo `/slots` falló: conservan su snapshot anterior. */
  slotErrors: string[];
}

export interface SyncOptions extends FeedOptions {
  db: SyncDb;
  now?: Date;
  windowDays?: number;
}

// ------------------------------------------------------------------ fechas --

/** `YYYY-MM-DD` en UTC (el feed y la columna `DATE` trabajan en fechas puras). */
export function utcISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function syncWindow(now: Date, days = SYNC_WINDOW_DAYS): { from: string; to: string } {
  const to = new Date(now.getTime());
  to.setUTCDate(to.getUTCDate() + days);
  return { from: utcISODate(now), to: utcISODate(to) };
}

// ------------------------------------------------------------------ mapeo ---

/** "Adulto nacional" → "adulto-nacional". Es la `key` de `PriceRow`. */
export function slugifyLabel(label: string, index: number): string {
  const slug = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `categoria-${index + 1}`;
}

function bilingual(text: string): { es: string; en: string } {
  // El feed es monolingüe: se guarda el mismo texto en los dos idiomas y Mark
  // lo traduce en /admin/catalogo. Nunca se inventa una traducción.
  return { es: text, en: text };
}

export function tripToFeedFields(trip: PexTrip, now: Date): ProductFeedFields {
  const table = trip.price_table.map((row, i) => ({
    key: slugifyLabel(row.label, i),
    label: bilingual(row.label),
    price: row.price,
  }));

  return {
    pexTripId: trip.id,
    pexPath: trip.path,
    priceFrom: trip.price_from,
    priceTable:
      table.length > 0
        ? table
        : [{ key: "persona", label: bilingual(trip.name), price: trip.price_from }],
    durationMin: trip.duration_min,
    capacityMin: trip.capacity_min,
    capacityMax: trip.capacity_max,
    available: trip.available,
    images: trip.images,
    syncedAt: now,
    // El feed es la fuente: lo que llega de él queda verificado hoy.
    verifiedAt: new Date(`${utcISODate(now)}T00:00:00.000Z`),
  };
}

/**
 * El feed no publica la unidad de cobro: el ferry se vende por tramo y el resto
 * por persona, tal como los publica PEX. Mark lo corrige en `/admin/catalogo` si
 * algún producto nuevo no encaja.
 */
export function priceUnitFor(kind: PexTripKind): string {
  return kind === "ferry" ? "per_segment" : "per_person";
}

export function tripToCreateFields(trip: PexTrip, now: Date): ProductCreateFields {
  return {
    ...tripToFeedFields(trip, now),
    slug: trip.slug,
    kind: trip.kind,
    priceUnit: priceUnitFor(trip.kind),
    name: bilingual(trip.name),
    summary: bilingual(""),
    description: bilingual(""),
    durationLabel: bilingual(trip.duration_min ? `${trip.duration_min} min` : ""),
    policies: trip.policies.map(bilingual),
    sourceUrl: null,
  };
}

export function slotToFields(slot: PexSlot, productId: string, now: Date): SlotFields {
  return {
    productId,
    pexSlotId: slot.id,
    date: slot.date,
    startTime: slot.start,
    endTime: slot.end,
    capacityRemaining: slot.capacity_remaining,
    price: slot.price,
    syncedAt: now,
  };
}

// ------------------------------------------------------------ orquestación --

/**
 * Copia el feed a la base. Devuelve `{ ok: false, reason }` sin escribir nada
 * si `/trips` no responde: el snapshot anterior sigue sirviendo al sitio.
 */
export async function syncPex(opts: SyncOptions): Promise<SyncResult> {
  const { db, now = new Date(), windowDays = SYNC_WINDOW_DAYS } = opts;
  const feedOpts: FeedOptions = {
    baseUrl: opts.baseUrl,
    fetchImpl: opts.fetchImpl,
    // El cron no puede servirse de una caché de 60 s: siempre lee del feed.
    noCache: true,
  };

  const empty = { trips: 0, products: 0, slots: 0, removed: 0, slotErrors: [] as string[] };

  let trips: PexTrip[];
  try {
    trips = await fetchTrips(feedOpts);
  } catch (error) {
    const reason = error instanceof PexFeedError ? error.reason : "feed_unavailable";
    return { ok: false, reason, ...empty };
  }

  const { from, to } = syncWindow(now, windowDays);
  // `empty` va primero: si se pusiera después pisaría `trips` con 0.
  const result: SyncResult = { ok: true, ...empty, trips: trips.length, slotErrors: [] };

  for (const trip of trips) {
    const existing = await db.findProduct(trip.id, trip.slug);
    const ref = existing
      ? (await db.updateProduct(existing.id, tripToFeedFields(trip, now)), existing)
      : await db.createProduct(tripToCreateFields(trip, now));
    result.products += 1;

    let slots: PexSlot[];
    try {
      slots = await fetchSlots({ tripId: trip.id, from, to }, feedOpts);
    } catch {
      // Sólo este producto se queda con el snapshot anterior; el resto sigue.
      result.slotErrors.push(trip.slug);
      continue;
    }

    for (const slot of slots) {
      await db.upsertSlot(slotToFields(slot, ref.id, now));
    }
    result.slots += slots.length;
    result.removed += await db.deleteStaleSlots(
      ref.id,
      from,
      to,
      slots.map((s) => s.id),
    );
  }

  return result;
}
