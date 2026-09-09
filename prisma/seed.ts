/**
 * Seed — `npm run db:seed`.
 *
 * Copia el catálogo en código (`src/content/catalog.ts`, verificado contra las
 * páginas públicas de Pacific Experience el 09/09/2026) a las tablas `Product` y
 * `ProductAddon`, con su `verifiedAt` y su `sourceUrl`.
 *
 * Es idempotente: hace `upsert` por `slug` y por `(productId, slug)` en los
 * adicionales, así que se puede correr las veces que haga falta. No borra nada
 * ni toca `commissionPct` ni `syncedAt` de las filas que ya existen: esos dos
 * los edita Mark en `/admin/catalogo` y los escribe el cron del feed.
 *
 * No inventa datos: todo lo que escribe sale del catálogo del bloque 2.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { catalog, type Product } from "../src/content/catalog";

const prisma = new PrismaClient();

/** `YYYY-MM-DD` → `Date` a medianoche UTC (la columna es `DATE`). */
function toDate(iso: string): Date | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00.000Z`) : null;
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/** Campos que el catálogo en código posee y el seed sí puede sobrescribir. */
function fields(product: Product) {
  const checkout = product.pexCheckout;
  return {
    kind: product.kind,
    source: product.source,
    pexTripId: checkout?.kind === "tour" ? checkout.tripId : null,
    pexPath: product.pexPath,
    pexVessel: checkout?.kind === "charter" ? checkout.vessel : null,
    name: json(product.name),
    summary: json(product.summary),
    description: json(product.description),
    priceFrom: product.priceFrom,
    priceUnit: product.priceUnit,
    priceTable: json(product.priceTable ?? []),
    pricePerPersonFrom: product.pricePerPersonFrom ?? null,
    durationMin: product.durationMin ?? null,
    durationLabel: json(product.durationLabel),
    schedule: product.schedule ? json(product.schedule) : Prisma.DbNull,
    capacityMin: product.capacityMin ?? null,
    capacityMax: product.capacityMax ?? null,
    includes: json(product.includes),
    notIncluded: json(product.notIncluded ?? []),
    policies: json(product.policies),
    images: json(product.images),
    badges: json(product.badges ?? []),
    available: product.available,
    verifiedAt: toDate(product.verifiedAt),
    sourceUrl: product.sourceUrl,
    order: product.order,
  };
}

async function seedProduct(product: Product): Promise<void> {
  const data = fields(product);

  const row = await prisma.product.upsert({
    where: { slug: product.slug },
    create: { slug: product.slug, ...data },
    update: data,
    select: { id: true },
  });

  for (const [index, addon] of (product.addons ?? []).entries()) {
    const addonData = {
      name: json(addon.name),
      price: addon.price,
      unit: addon.unit,
      durationMin: addon.durationMin ?? null,
      active: addon.active,
      order: index + 1,
    };
    await prisma.productAddon.upsert({
      where: { productId_slug: { productId: row.id, slug: addon.slug } },
      create: { productId: row.id, slug: addon.slug, ...addonData },
      update: addonData,
    });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("sin DATABASE_URL: nada que sembrar");
    return;
  }

  for (const product of catalog) {
    await seedProduct(product);
    console.log(`✔ ${product.slug} (${(product.addons ?? []).length} adicionales)`);
  }

  const total = await prisma.product.count();
  console.log(`catálogo sembrado: ${catalog.length} productos escritos, ${total} en la tabla`);
}

main()
  .catch((error) => {
    console.error("seed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
