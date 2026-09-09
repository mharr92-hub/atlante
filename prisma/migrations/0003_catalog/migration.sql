-- 0003_catalog — R1c: catálogo en base de datos y espejo del feed de PEX.
--
-- Generada con:
--   prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma \
--                       --to-schema-datamodel prisma/schema.prisma --script
-- (`schema.base.prisma` = `prisma/schema.prisma` en el commit anterior; se borró
-- después de generar el diff). NO se ejecutó contra ninguna base de datos.
--
-- Todo es aditivo: crea `Product`, `ProductAddon` y `ProductSlot`, y añade
-- `Lead.pexSlotId`. No toca ninguna tabla ni columna existente, así que se puede
-- aplicar sobre una base con datos sin migrar nada a mano.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "pexSlotId" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'pex',
    "pexTripId" TEXT,
    "pexPath" TEXT NOT NULL,
    "pexVessel" TEXT,
    "name" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "priceFrom" DECIMAL(10,2) NOT NULL,
    "priceUnit" TEXT NOT NULL,
    "priceTable" JSONB,
    "pricePerPersonFrom" DECIMAL(10,2),
    "durationMin" INTEGER,
    "durationLabel" JSONB NOT NULL,
    "schedule" JSONB,
    "capacityMin" INTEGER,
    "capacityMax" INTEGER,
    "includes" JSONB,
    "notIncluded" JSONB,
    "policies" JSONB,
    "images" JSONB,
    "badges" JSONB,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" DATE,
    "sourceUrl" TEXT,
    "commissionPct" DECIMAL(5,2),
    "order" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAddon" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "price" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'per_person',
    "durationMin" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSlot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pexSlotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "capacityRemaining" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_available_order_idx" ON "Product"("available", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAddon_productId_slug_key" ON "ProductAddon"("productId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSlot_pexSlotId_key" ON "ProductSlot"("pexSlotId");

-- CreateIndex
CREATE INDEX "ProductSlot_productId_date_idx" ON "ProductSlot"("productId", "date");

-- CreateIndex
CREATE INDEX "ProductSlot_date_idx" ON "ProductSlot"("date");

-- AddForeignKey
ALTER TABLE "ProductAddon" ADD CONSTRAINT "ProductAddon_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSlot" ADD CONSTRAINT "ProductSlot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
