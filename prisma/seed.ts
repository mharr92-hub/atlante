/**
 * Seed — `npm run db:seed`.
 *
 * Copia a la base de datos lo que vive en código:
 *   - `src/content/catalog.ts` → `Product` / `ProductAddon` (bloque 2);
 *   - `src/content/vessels.ts` → `Operator` / `Vessel` (bloque 4).
 *
 * Todo verificado contra las páginas públicas de Pacific Experience el
 * 09/09/2026, con su `verifiedAt` y su `sourceUrl`.
 *
 * Es idempotente: hace `upsert` por `slug` y por `(productId, slug)` en los
 * adicionales, así que se puede correr las veces que haga falta. No borra nada
 * ni toca los campos internos de las filas que ya existen —`commissionPct`,
 * `syncedAt`, y en el operador el contrato, la licencia AMP, el seguro y la
 * casilla `verified`—: esos los edita Mark en el admin.
 *
 * No inventa datos: todo lo que escribe sale de los bloques 2 y 4.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { catalog, type Product } from "../src/content/catalog";
import { operators, vessels, type Operator, type Vessel } from "../src/content/vessels";

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

// ------------------------------------------- marketplace de charters (R2) ---

/** Campos del operador que el código posee. El resto es interno de Mark. */
function operatorFields(operator: Operator) {
  return {
    name: operator.name,
    whatsapp: operator.whatsapp ?? null,
    email: operator.email ?? null,
    active: operator.active,
  };
}

async function seedOperator(operator: Operator): Promise<string> {
  const row = await prisma.operator.upsert({
    where: { slug: operator.slug },
    create: {
      slug: operator.slug,
      ...operatorFields(operator),
      // Sólo al crear: después manda `/admin/operadores`.
      commissionPct: operator.commissionPct ?? null,
      contractSignedAt: toDate(operator.contractSignedAt ?? ""),
      ampLicense: operator.ampLicense ?? null,
      insuranceUntil: toDate(operator.insuranceUntil ?? ""),
      verified: operator.verified,
    },
    update: operatorFields(operator),
    select: { id: true },
  });
  return row.id;
}

function vesselFields(vessel: Vessel, operatorId: string) {
  return {
    operatorId,
    name: vessel.name,
    type: vessel.type,
    lengthFt: vessel.lengthFt ?? null,
    capacityMax: vessel.capacityMax,
    marina: vessel.marina,
    pricing: json(vessel.pricing),
    routes: json(vessel.routes),
    includes: json(vessel.includes),
    onRequest: json(vessel.onRequest),
    depositPct: vessel.depositPct,
    cancellationPolicy: json(vessel.cancellationPolicy),
    photos: json(vessel.photos),
    video: vessel.video ?? null,
    closeMode: vessel.closeMode,
    pexVesselSlug: vessel.pexVesselSlug ?? null,
    pexPath: vessel.pexPath ?? null,
    pexPricePerPersonFrom: vessel.pexPricePerPersonFrom ?? null,
    summary: vessel.summary ? json(vessel.summary) : Prisma.DbNull,
    description: vessel.description ? json(vessel.description) : Prisma.DbNull,
    verifiedAt: toDate(vessel.verifiedAt),
    sourceUrl: vessel.sourceUrl ?? null,
    active: vessel.active,
    order: vessel.order,
  };
}

async function seedVessel(vessel: Vessel, operatorId: string): Promise<void> {
  const data = vesselFields(vessel, operatorId);
  await prisma.vessel.upsert({
    where: { slug: vessel.slug },
    create: { slug: vessel.slug, ...data },
    update: data,
  });
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

  const operatorIds = new Map<string, string>();
  for (const operator of operators) {
    operatorIds.set(operator.slug, await seedOperator(operator));
    console.log(`✔ operador ${operator.slug}`);
  }

  for (const vessel of vessels) {
    const operatorId = operatorIds.get(vessel.operatorSlug);
    if (!operatorId) {
      console.warn(`✖ ${vessel.slug}: no existe el operador ${vessel.operatorSlug}`);
      continue;
    }
    await seedVessel(vessel, operatorId);
    console.log(`✔ nave ${vessel.slug} (${vessel.pricing.length} filas de precio)`);
  }

  const [products, vesselCount] = await Promise.all([
    prisma.product.count(),
    prisma.vessel.count(),
  ]);
  console.log(
    `catálogo sembrado: ${catalog.length} productos escritos, ${products} en la tabla; ` +
      `${vessels.length} naves escritas, ${vesselCount} en la tabla`,
  );
}

main()
  .catch((error) => {
    console.error("seed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
