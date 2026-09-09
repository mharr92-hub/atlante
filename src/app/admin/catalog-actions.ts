"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clearCatalogCache } from "@/lib/catalog";
import {
  localized,
  parseImages,
  parseIntOrNull,
  parseISODate,
  parseLocalizedLines,
  parseNumber,
  parsePriceTable,
  parseSchedule,
} from "@/lib/catalog-forms";

/**
 * Edición del catálogo desde `/admin/catalogo` (bloque 3.5).
 *
 * Todas las acciones pasan por `requireAdmin()` y todas invalidan la caché en
 * proceso de `lib/catalog.ts`, para que el cambio se vea en el sitio sin esperar
 * los 60 s. Sin base de datos no hacen nada: el catálogo en código sólo se
 * cambia en el repo.
 */

const PRICE_UNITS = ["per_person", "per_segment", "per_boat"];
const ADDON_UNITS = ["per_person", "per_booking", "pending"];

function refresh(slug?: string) {
  clearCatalogCache();
  revalidatePath("/admin/catalogo");
  if (slug) {
    revalidatePath(`/admin/catalogo/${slug}`);
    revalidatePath(`/tours/${slug}`);
    revalidatePath(`/reservar/${slug}`);
  }
  revalidatePath("/tours");
  revalidatePath("/charters");
  revalidatePath("/");
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/** Guarda un producto entero. Los campos vacíos se guardan vacíos, sin invento. */
export async function saveProductAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const slug = text(formData, "slug").trim();
  if (!slug) return;

  const priceFrom = parseNumber(formData.get("priceFrom"), 0, 1_000_000);
  if (priceFrom === null) return;

  const priceUnitRaw = text(formData, "priceUnit");
  const schedule = parseSchedule({
    weekdays: formData.getAll("weekdays").map(String),
    times: text(formData, "scheduleTimes"),
    validFrom: text(formData, "scheduleValidFrom"),
    noteEs: text(formData, "scheduleNoteEs"),
    noteEn: text(formData, "scheduleNoteEn"),
  });

  const verifiedAt = parseISODate(text(formData, "verifiedAt"));
  const commissionPct = parseNumber(formData.get("commissionPct"), 0, 100);
  const priceTable = parsePriceTable(text(formData, "priceTable"));

  await db.product.update({
    where: { slug },
    data: {
      name: json(localized(text(formData, "nameEs"), text(formData, "nameEn"))),
      summary: json(localized(text(formData, "summaryEs"), text(formData, "summaryEn"))),
      description: json(
        localized(text(formData, "descriptionEs"), text(formData, "descriptionEn")),
      ),
      priceFrom,
      priceUnit: PRICE_UNITS.includes(priceUnitRaw) ? priceUnitRaw : "per_person",
      priceTable: json(priceTable),
      pricePerPersonFrom: parseNumber(formData.get("pricePerPersonFrom"), 0, 1_000_000),
      durationMin: parseIntOrNull(formData.get("durationMin"), 0, 10_000),
      durationLabel: json(
        localized(text(formData, "durationLabelEs"), text(formData, "durationLabelEn")),
      ),
      schedule: schedule ? json(schedule) : Prisma.DbNull,
      capacityMin: parseIntOrNull(formData.get("capacityMin"), 0, 1_000),
      capacityMax: parseIntOrNull(formData.get("capacityMax"), 0, 1_000),
      includes: json(
        parseLocalizedLines(text(formData, "includesEs"), text(formData, "includesEn")),
      ),
      notIncluded: json(
        parseLocalizedLines(text(formData, "notIncludedEs"), text(formData, "notIncludedEn")),
      ),
      policies: json(
        parseLocalizedLines(text(formData, "policiesEs"), text(formData, "policiesEn")),
      ),
      images: json(parseImages(text(formData, "images"))),
      available: formData.get("available") === "on",
      verifiedAt: verifiedAt ? new Date(`${verifiedAt}T00:00:00.000Z`) : null,
      sourceUrl: text(formData, "sourceUrl").trim() || null,
      commissionPct,
      order: parseIntOrNull(formData.get("order"), 0, 9_999) ?? 0,
    },
  });

  refresh(slug);
}

/** Botón "Marcar verificado hoy" (3.5). */
export async function markVerifiedTodayAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const slug = text(formData, "slug").trim();
  if (!slug) return;

  const today = new Date().toISOString().slice(0, 10);
  await db.product.update({
    where: { slug },
    data: { verifiedAt: new Date(`${today}T00:00:00.000Z`) },
  });

  refresh(slug);
}

/** Guarda un adicional existente (precio, unidad, textos, activo). */
export async function saveAddonAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const id = text(formData, "id").trim();
  const slug = text(formData, "productSlug").trim();
  const price = parseNumber(formData.get("price"), 0, 1_000_000);
  if (!id || price === null) return;

  const unit = text(formData, "unit");
  await db.productAddon.update({
    where: { id },
    data: {
      name: json(localized(text(formData, "nameEs"), text(formData, "nameEn"))),
      price,
      unit: ADDON_UNITS.includes(unit) ? unit : "per_person",
      durationMin: parseIntOrNull(formData.get("durationMin"), 0, 10_000),
      active: formData.get("active") === "on",
    },
  });

  refresh(slug || undefined);
}
