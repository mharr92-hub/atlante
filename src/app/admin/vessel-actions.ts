"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clearVesselCache } from "@/lib/vessels";
import {
  localized,
  parseImages,
  parseIntOrNull,
  parseISODate,
  parseLocalizedLines,
  parseNumber,
  slugifyKey,
} from "@/lib/catalog-forms";
import { parseOnRequestItems, parsePricingRows, parseRoutes } from "@/lib/vessel-forms";

/**
 * Admin del marketplace (bloque 4.3): operadores y naves. Todo pasa por
 * `requireAdmin()` y todo invalida la caché en proceso de `lib/vessels.ts`, para
 * que el cambio se vea en el sitio sin esperar los 60 s.
 *
 * Las solicitudes de aliados y los códigos viven en
 * `src/app/admin/partner-actions.ts` (bloque 5.1).
 *
 * `commissionPct`, el contrato, la licencia AMP y el seguro son internos: se
 * escriben aquí y no salen nunca a una página pública.
 */

const CLOSE_MODES = ["deeplink", "quote"];

function refresh(slug?: string) {
  clearVesselCache();
  revalidatePath("/admin/naves");
  revalidatePath("/admin/operadores");
  if (slug) {
    revalidatePath(`/admin/naves/${slug}`);
    revalidatePath(`/charters/${slug}`);
    revalidatePath(`/cotizar/${slug}`);
  }
  revalidatePath("/charters");
  revalidatePath("/charters/comparar");
  revalidatePath("/");
  // El sitemap lista las naves activas: si se apaga una, sale.
  revalidatePath("/sitemap.xml");
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function date(value: string | null): Date | null {
  const iso = parseISODate(value ?? "");
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

// ------------------------------------------------------------ operadores ----

export async function saveOperatorAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const slug = slugifyKey(text(formData, "slug"));
  const name = text(formData, "name").trim();
  if (!slug || !name) return;

  const data = {
    name,
    whatsapp: text(formData, "whatsapp").replace(/\D+/g, "").slice(0, 20) || null,
    email: text(formData, "email").trim().slice(0, 160) || null,
    commissionPct: parseNumber(formData.get("commissionPct"), 0, 100),
    contractSignedAt: date(text(formData, "contractSignedAt")),
    ampLicense: text(formData, "ampLicense").trim().slice(0, 120) || null,
    insuranceUntil: date(text(formData, "insuranceUntil")),
    verified: formData.get("verified") === "on",
    active: formData.get("active") === "on",
  };

  await db.operator.upsert({
    where: { slug },
    create: { slug, ...data },
    update: data,
  });

  refresh();
}

/** Borrado real, sólo si no le cuelga ninguna nave (la FK es en cascada). */
export async function deleteOperatorAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const slug = slugifyKey(text(formData, "slug"));
  if (!slug) return;

  const operator = await db.operator.findUnique({
    where: { slug },
    select: { id: true, _count: { select: { vessels: true } } },
  });
  if (!operator || operator._count.vessels > 0) return;

  await db.operator.delete({ where: { id: operator.id } });
  refresh();
}

// ----------------------------------------------------------------- naves ----

export async function saveVesselAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const slug = slugifyKey(text(formData, "slug"));
  const name = text(formData, "name").trim();
  const capacityMax = parseIntOrNull(formData.get("capacityMax"), 1, 1000);
  if (!slug || !name || capacityMax === null) return;

  const operatorSlug = slugifyKey(text(formData, "operatorSlug"));
  const operator = await db.operator.findUnique({
    where: { slug: operatorSlug },
    select: { id: true },
  });
  if (!operator) return;

  const closeMode = text(formData, "closeMode");
  const summary = localized(text(formData, "summaryEs"), text(formData, "summaryEn"));
  const description = localized(
    text(formData, "descriptionEs"),
    text(formData, "descriptionEn"),
  );

  const data = {
    operatorId: operator.id,
    name,
    type: slugifyKey(text(formData, "type")) || "no_publicado",
    lengthFt: parseIntOrNull(formData.get("lengthFt"), 1, 1000),
    capacityMax,
    marina: text(formData, "marina").trim().slice(0, 160),
    pricing: json(parsePricingRows(text(formData, "pricing"))),
    routes: json(parseRoutes(text(formData, "routes"))),
    includes: json(
      parseLocalizedLines(text(formData, "includesEs"), text(formData, "includesEn")),
    ),
    onRequest: json(parseOnRequestItems(text(formData, "onRequest"))),
    depositPct: parseIntOrNull(formData.get("depositPct"), 0, 100) ?? 0,
    cancellationPolicy: json(
      localized(text(formData, "cancellationEs"), text(formData, "cancellationEn")),
    ),
    photos: json(parseImages(text(formData, "photos"))),
    video: text(formData, "video").trim().slice(0, 300) || null,
    closeMode: CLOSE_MODES.includes(closeMode) ? closeMode : "quote",
    pexVesselSlug: text(formData, "pexVesselSlug").trim().slice(0, 120) || null,
    pexPath: text(formData, "pexPath").trim().slice(0, 200) || null,
    pexPricePerPersonFrom: parseNumber(formData.get("pexPricePerPersonFrom"), 0, 1_000_000),
    summary: summary.es ? json(summary) : Prisma.DbNull,
    description: description.es ? json(description) : Prisma.DbNull,
    verifiedAt: date(text(formData, "verifiedAt")),
    sourceUrl: text(formData, "sourceUrl").trim().slice(0, 300) || null,
    active: formData.get("active") === "on",
    order: parseIntOrNull(formData.get("order"), 0, 9_999) ?? 0,
  };

  await db.vessel.upsert({
    where: { slug },
    create: { slug, ...data },
    update: data,
  });

  refresh(slug);
}

export async function deleteVesselAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const slug = slugifyKey(text(formData, "slug"));
  if (!slug) return;

  // Los leads guardan `vesselSlug` como texto: borrar la ficha no los rompe,
  // sólo deja de publicarla.
  await db.vessel.deleteMany({ where: { slug } });
  refresh(slug);
}

/** "Marcar verificado hoy" de la ficha de la nave. */
export async function markVesselVerifiedTodayAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const slug = slugifyKey(text(formData, "slug"));
  if (!slug) return;

  const today = new Date().toISOString().slice(0, 10);
  await db.vessel.updateMany({
    where: { slug },
    data: { verifiedAt: new Date(`${today}T00:00:00.000Z`) },
  });
  refresh(slug);
}
