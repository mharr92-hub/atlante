-- 0004_charters — R2: marketplace de charters.
--
-- Generada con:
--   prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma \
--                       --to-schema-datamodel prisma/schema.prisma --script
-- (`schema.base.prisma` = `prisma/schema.prisma` en el commit anterior; se borró
-- después de generar el diff). NO se ejecutó contra ninguna base de datos.
--
-- Todo es aditivo: crea `Operator` y `Vessel`, añade `Lead.hours` /
-- `Lead.occasion` y `PartnerApplication.kind` / `.message`. No borra ni cambia
-- ninguna columna existente, así que se puede aplicar sobre una base con datos.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "hours" INTEGER,
ADD COLUMN     "occasion" TEXT;

-- AlterTable
ALTER TABLE "PartnerApplication" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'operator',
ADD COLUMN     "message" TEXT;

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "commissionPct" DECIMAL(5,2),
    "contractSignedAt" DATE,
    "ampLicense" TEXT,
    "insuranceUntil" DATE,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vessel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lengthFt" INTEGER,
    "capacityMax" INTEGER NOT NULL,
    "marina" TEXT NOT NULL,
    "pricing" JSONB NOT NULL,
    "routes" JSONB NOT NULL,
    "includes" JSONB NOT NULL,
    "onRequest" JSONB NOT NULL,
    "depositPct" INTEGER NOT NULL DEFAULT 30,
    "cancellationPolicy" JSONB NOT NULL,
    "photos" JSONB NOT NULL,
    "video" TEXT,
    "closeMode" TEXT NOT NULL DEFAULT 'quote',
    "pexVesselSlug" TEXT,
    "pexPath" TEXT,
    "pexPricePerPersonFrom" DECIMAL(10,2),
    "summary" JSONB,
    "description" JSONB,
    "verifiedAt" DATE,
    "sourceUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vessel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_slug_key" ON "Operator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Vessel_slug_key" ON "Vessel"("slug");

-- CreateIndex
CREATE INDEX "Vessel_active_order_idx" ON "Vessel"("active", "order");

-- CreateIndex
CREATE INDEX "Vessel_operatorId_idx" ON "Vessel"("operatorId");

-- CreateIndex
CREATE INDEX "PartnerApplication_status_createdAt_idx" ON "PartnerApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Vessel" ADD CONSTRAINT "Vessel_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

