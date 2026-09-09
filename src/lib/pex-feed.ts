/**
 * Cliente del feed público de Pacific Experience (cambio X4 del anexo).
 *
 * PEX todavía NO lo publica: mientras `PEX_FEED_URL` no exista o no responda,
 * `feedConfigured()` es `false` y todo el sitio se queda en modo puente con el
 * catálogo de `src/content/catalog.ts`. Este archivo no lanza nada al render:
 * lo consume el cron (`/api/cron/sync-pex`), que persiste el snapshot.
 *
 * Contrato esperado (bloque 3.1):
 *   GET {PEX_FEED_URL}/trips
 *   GET {PEX_FEED_URL}/slots?trip_id=&from=&to=
 *
 * El feed es de otro proyecto: se valida campo a campo y se descarta lo que no
 * cumpla el contrato en vez de confiar en la forma del JSON.
 */

export type PexTripKind = "tour" | "party" | "ferry";

export interface PexPriceRow {
  label: string;
  price: number;
}

export interface PexTrip {
  id: string;
  slug: string;
  kind: PexTripKind;
  name: string;
  price_from: number;
  price_table: PexPriceRow[];
  duration_min: number | null;
  capacity_min: number | null;
  capacity_max: number | null;
  policies: string[];
  images: string[];
  path: string;
  available: boolean;
}

export interface PexSlot {
  id: string;
  trip_id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM`. */
  start: string;
  end: string | null;
  capacity_remaining: number;
  price: number | null;
}

/** Timeout duro de cada llamada al feed. */
export const FEED_TIMEOUT_MS = 5_000;
/** Vida de la caché en memoria (el propio feed cachea 60 s del lado de PEX). */
export const FEED_CACHE_MS = 60_000;

export class PexFeedError extends Error {
  constructor(readonly reason: string, message?: string) {
    super(message ?? reason);
    this.name = "PexFeedError";
  }
}

export interface FeedOptions {
  /** Base del feed; por defecto `PEX_FEED_URL`. */
  baseUrl?: string;
  /** Inyectable en tests; por defecto el `fetch` global. */
  fetchImpl?: typeof fetch;
  /** Salta la caché en memoria (el cron la evita para no repetir snapshots). */
  noCache?: boolean;
}

// ------------------------------------------------------------ configuración --

export function feedBaseUrl(explicit?: string): string | null {
  const raw = (explicit ?? process.env.PEX_FEED_URL ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function feedConfigured(): boolean {
  return feedBaseUrl() !== null;
}

// -------------------------------------------------------------- validación --

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{1,2}:\d{2}$/;
const KINDS: PexTripKind[] = ["tour", "party", "ferry"];

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(str).filter((v): v is string => v !== null) : [];
}

function priceTable(value: unknown): PexPriceRow[] {
  if (!Array.isArray(value)) return [];
  const rows: PexPriceRow[] = [];
  for (const raw of value) {
    const row = (raw ?? {}) as Record<string, unknown>;
    const label = str(row.label);
    const price = num(row.price);
    if (label === null || price === null || price < 0) continue;
    rows.push({ label, price });
  }
  return rows;
}

/** Un trip del feed, o `null` si le falta algo del contrato. */
export function parseTrip(raw: unknown): PexTrip | null {
  const t = (raw ?? {}) as Record<string, unknown>;

  const id = str(t.id);
  const slug = str(t.slug);
  const name = str(t.name);
  const path = str(t.path);
  const priceFrom = num(t.price_from);
  const kind = str(t.kind) as PexTripKind | null;

  if (!id || !slug || !name || !path || priceFrom === null || priceFrom < 0) return null;
  if (!kind || !KINDS.includes(kind)) return null;
  if (!path.startsWith("/")) return null;

  return {
    id,
    slug,
    kind,
    name,
    price_from: priceFrom,
    price_table: priceTable(t.price_table),
    duration_min: num(t.duration_min),
    capacity_min: num(t.capacity_min),
    capacity_max: num(t.capacity_max),
    policies: strList(t.policies),
    images: strList(t.images),
    path,
    // Sin dato explícito se asume disponible: el feed sólo publica lo que vende.
    available: t.available === undefined ? true : t.available === true,
  };
}

export function parseTrips(raw: unknown): PexTrip[] {
  if (!Array.isArray(raw)) throw new PexFeedError("bad_payload", "/trips no devolvió una lista");
  return raw.map(parseTrip).filter((t): t is PexTrip => t !== null);
}

/** Una salida del feed, o `null` si la fecha, la hora o el cupo no son válidos. */
export function parseSlot(raw: unknown): PexSlot | null {
  const s = (raw ?? {}) as Record<string, unknown>;

  const id = str(s.id);
  const tripId = str(s.trip_id);
  const date = str(s.date);
  const start = str(s.start);
  const capacity = num(s.capacity_remaining);

  if (!id || !tripId || !date || !start) return null;
  if (!ISO_DATE.test(date) || !HHMM.test(start)) return null;
  if (capacity === null || capacity < 0) return null;

  const end = str(s.end);
  const price = num(s.price);

  return {
    id,
    trip_id: tripId,
    date,
    start,
    end: end && HHMM.test(end) ? end : null,
    capacity_remaining: Math.trunc(capacity),
    price: price !== null && price >= 0 ? price : null,
  };
}

export function parseSlots(raw: unknown): PexSlot[] {
  if (!Array.isArray(raw)) throw new PexFeedError("bad_payload", "/slots no devolvió una lista");
  return raw.map(parseSlot).filter((s): s is PexSlot => s !== null);
}

// ------------------------------------------------------------------ caché ---

interface CacheEntry {
  at: number;
  value: unknown;
}

const cache = new Map<string, CacheEntry>();

/** Vacía la caché en memoria (tests y cron manual). */
export function clearFeedCache(): void {
  cache.clear();
}

// ------------------------------------------------------------------ red -----

async function getJson(url: string, opts: FeedOptions): Promise<unknown> {
  if (!opts.noCache) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < FEED_CACHE_MS) return hit.value;
  }

  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== "function") throw new PexFeedError("no_fetch");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  let response: Response;
  try {
    response = await doFetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    throw new PexFeedError(
      (cause as Error)?.name === "AbortError" ? "timeout" : "network_error",
      `no se pudo leer ${url}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw new PexFeedError(`http_${response.status}`);

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new PexFeedError("bad_json");
  }

  cache.set(url, { at: Date.now(), value });
  return value;
}

/** `GET {PEX_FEED_URL}/trips`. Lanza `PexFeedError` si el feed no responde. */
export async function fetchTrips(opts: FeedOptions = {}): Promise<PexTrip[]> {
  const base = feedBaseUrl(opts.baseUrl);
  if (!base) throw new PexFeedError("feed_not_configured");
  return parseTrips(await getJson(`${base}/trips`, opts));
}

export interface SlotQuery {
  tripId?: string;
  /** `YYYY-MM-DD`. */
  from?: string;
  /** `YYYY-MM-DD`. */
  to?: string;
}

/** `GET {PEX_FEED_URL}/slots?trip_id=&from=&to=`. */
export async function fetchSlots(
  query: SlotQuery = {},
  opts: FeedOptions = {},
): Promise<PexSlot[]> {
  const base = feedBaseUrl(opts.baseUrl);
  if (!base) throw new PexFeedError("feed_not_configured");

  const params = new URLSearchParams();
  if (query.tripId) params.set("trip_id", query.tripId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);

  const qs = params.toString();
  return parseSlots(await getJson(`${base}/slots${qs ? `?${qs}` : ""}`, opts));
}
