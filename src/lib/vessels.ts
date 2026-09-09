/**
 * La única puerta de entrada al marketplace de naves.
 *
 * Orden de preferencia, igual que el catálogo (bloque 3.2):
 *   1. tablas `Vessel` / `Operator` de la base de datos, si hay filas;
 *   2. `src/content/vessels.ts`, el respaldo en código.
 *
 * Así `/charters` sigue en pie sin `DATABASE_URL` (regla 9) y el admin puede dar
 * de alta operadores aliados sin desplegar.
 */
import "server-only";
import type { Prisma } from "@prisma/client";
import type { Localized } from "@/content/catalog";
import {
  operators as codeOperators,
  vessels as codeVessels,
  type CloseMode,
  type OnRequestItem,
  type OnRequestUnit,
  type Operator,
  type PricingRow,
  type Vessel,
} from "@/content/vessels";
import { getDb } from "@/lib/db";

export type { Operator, Vessel, PricingRow, OnRequestItem } from "@/content/vessels";

export type VesselSource = "db" | "code";

export interface VesselSnapshot {
  vessels: Vessel[];
  operators: Operator[];
  source: VesselSource;
}

/** Caché en proceso: una página pide la lista varias veces por render. */
const CACHE_MS = 60_000;
let cached: { at: number; snapshot: VesselSnapshot } | null = null;

/** Invalidar tras editar en `/admin/naves` o `/admin/operadores`. */
export function clearVesselCache(): void {
  cached = null;
}

// ------------------------------------------------------- mapeo desde la DB --

type VesselRow = Prisma.VesselGetPayload<{ include: { operator: true } }>;
type OperatorRow = Prisma.OperatorGetPayload<object>;

const ON_REQUEST_UNITS: OnRequestUnit[] = ["per_person", "per_hour", "per_booking"];

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

/** `Date` (columna `DATE`) → `YYYY-MM-DD`, sin pasar por la zona local. */
function isoDay(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/** Filas de precios; las que no traen los cuatro campos se descartan. */
export function parsePricing(value: unknown): PricingRow[] {
  if (!Array.isArray(value)) return [];
  const rows: PricingRow[] = [];
  for (const raw of value) {
    const row = (raw ?? {}) as Record<string, unknown>;
    const route = typeof row.route === "string" ? row.route : "";
    const hours = Number(row.hours);
    const capacityMax = Number(row.capacityMax);
    const price = Number(row.price);
    if (!route || !Number.isFinite(hours) || !Number.isFinite(capacityMax)) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    rows.push({ route, hours, capacityMax, price });
  }
  return rows;
}

export function parseOnRequest(value: unknown): OnRequestItem[] {
  if (!Array.isArray(value)) return [];
  const items: OnRequestItem[] = [];
  for (const raw of value) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const label = localized(item.label);
    if (!label.es && !label.en) continue;
    const price = Number(item.price);
    const unit = typeof item.unit === "string" ? item.unit : "";
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

export function rowToOperator(row: OperatorRow): Operator {
  return {
    slug: row.slug,
    name: row.name,
    ...(row.whatsapp ? { whatsapp: row.whatsapp } : {}),
    ...(row.email ? { email: row.email } : {}),
    ...(row.commissionPct !== null ? { commissionPct: Number(row.commissionPct) } : {}),
    ...(row.contractSignedAt ? { contractSignedAt: isoDay(row.contractSignedAt) } : {}),
    ...(row.ampLicense ? { ampLicense: row.ampLicense } : {}),
    ...(row.insuranceUntil ? { insuranceUntil: isoDay(row.insuranceUntil) } : {}),
    verified: row.verified,
    active: row.active,
  };
}

export function rowToVessel(row: VesselRow): Vessel {
  const photos = stringList(row.photos);
  return {
    slug: row.slug,
    operatorSlug: row.operator.slug,
    name: row.name,
    type: row.type,
    ...(row.lengthFt !== null ? { lengthFt: row.lengthFt } : {}),
    capacityMax: row.capacityMax,
    marina: row.marina,
    pricing: parsePricing(row.pricing),
    routes: stringList(row.routes),
    includes: localizedList(row.includes),
    onRequest: parseOnRequest(row.onRequest),
    depositPct: row.depositPct,
    cancellationPolicy: localized(row.cancellationPolicy),
    photos: photos.length > 0 ? photos : ["/og-atlante.jpg"],
    ...(row.video ? { video: row.video } : {}),
    closeMode: (row.closeMode === "deeplink" ? "deeplink" : "quote") as CloseMode,
    ...(row.pexVesselSlug ? { pexVesselSlug: row.pexVesselSlug } : {}),
    ...(row.pexPath ? { pexPath: row.pexPath } : {}),
    ...(row.pexPricePerPersonFrom !== null
      ? { pexPricePerPersonFrom: Number(row.pexPricePerPersonFrom) }
      : {}),
    ...(row.summary ? { summary: localized(row.summary) } : {}),
    ...(row.description ? { description: localized(row.description) } : {}),
    verifiedAt: isoDay(row.verifiedAt),
    ...(row.sourceUrl ? { sourceUrl: row.sourceUrl } : {}),
    active: row.active,
    order: row.order,
  };
}

// ------------------------------------------------------------------ lectura --

async function loadSnapshot(): Promise<VesselSnapshot> {
  const db = getDb();
  const fallback: VesselSnapshot = {
    vessels: codeVessels,
    operators: codeOperators,
    source: "code",
  };
  if (!db) return fallback;

  try {
    const rows = await db.vessel.findMany({
      include: { operator: true },
      orderBy: [{ order: "asc" }, { slug: "asc" }],
    });
    // Tabla vacía = marketplace aún sin sembrar: manda el respaldo en código.
    if (rows.length === 0) return fallback;

    const operatorRows = await db.operator.findMany({ orderBy: { slug: "asc" } });
    return {
      vessels: rows.map(rowToVessel),
      operators: operatorRows.map(rowToOperator),
      source: "db",
    };
  } catch {
    console.warn("[vessels] sin base de datos; se sirven las naves en código");
    return fallback;
  }
}

export async function getVesselSnapshot(): Promise<VesselSnapshot> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.snapshot;
  const snapshot = await loadSnapshot();
  cached = { at: Date.now(), snapshot };
  return snapshot;
}

/** Todas las naves, activas o no (el admin las necesita completas). */
export async function getAllVessels(): Promise<Vessel[]> {
  return (await getVesselSnapshot()).vessels;
}

/** Las naves que se publican en `/charters`. */
export async function getVessels(): Promise<Vessel[]> {
  return (await getAllVessels()).filter((v) => v.active);
}

export async function getVessel(slug: string): Promise<Vessel | undefined> {
  if (!slug) return undefined;
  return (await getAllVessels()).find((v) => v.slug === slug);
}

export async function getOperators(): Promise<Operator[]> {
  return (await getVesselSnapshot()).operators;
}

export async function getOperator(slug: string): Promise<Operator | undefined> {
  if (!slug) return undefined;
  return (await getOperators()).find((o) => o.slug === slug);
}

export async function getVesselSource(): Promise<VesselSource> {
  return (await getVesselSnapshot()).source;
}

/** `slug` → nombre de la nave, para las tablas del admin y los CSV. */
export async function vesselLabels(): Promise<(slug: string) => string> {
  const names = new Map((await getAllVessels()).map((v) => [v.slug, v.name]));
  return (slug: string) => names.get(slug) ?? slug;
}
