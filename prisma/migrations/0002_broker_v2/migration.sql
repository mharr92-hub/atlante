-- R1 — broker de Pacific Experience.
--
-- Generado con:
--   npx prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma \
--     --to-schema-datamodel prisma/schema.prisma --script
--
-- Editado a mano en un punto: el diff resolvía `Lead` -> `Subscriber` como
-- ALTER de la tabla existente (le agregaba las columnas NOT NULL del lead
-- nuevo sobre las filas del newsletter). Aquí se hace el RENAME real y el
-- `Lead` de intención de compra se crea vacío, como corresponde.

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('created', 'redirected', 'paid', 'paid_unmatched', 'lost', 'quote_requested', 'quoted', 'accepted');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('tour', 'party', 'ferry', 'charter_pex', 'charter_partner');

-- RenameTable: el Lead de newsletter pasa a llamarse Subscriber (conserva sus filas)
ALTER TABLE "Lead" RENAME TO "Subscriber";
ALTER TABLE "Subscriber" RENAME CONSTRAINT "Lead_pkey" TO "Subscriber_pkey";
ALTER INDEX "Lead_email_key" RENAME TO "Subscriber_email_key";

-- CreateTable: el Lead nuevo es la intención de compra del funnel
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "type" "LeadType" NOT NULL,
    "productSlug" TEXT,
    "vesselSlug" TEXT,
    "serviceDate" DATE,
    "timeSlot" TEXT,
    "pax" JSONB,
    "paxTotal" INTEGER,
    "addons" JSONB,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "partnerCode" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "landingPath" TEXT,
    "destinationUrl" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'created',
    "pexBookingId" TEXT,
    "amount" DECIMAL(10,2),
    "commissionPct" DECIMAL(5,2),
    "commissionAmount" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redirectedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handoff" (
    "token" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "PexEvent" (
    "id" TEXT NOT NULL,
    "pexBookingId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signatureOk" BOOLEAN NOT NULL,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PexEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vesselName" TEXT,
    "capacity" INTEGER,
    "zone" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "photos" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_pexBookingId_key" ON "Lead"("pexBookingId");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_serviceDate_idx" ON "Lead"("serviceDate");

-- CreateIndex
CREATE INDEX "Handoff_leadId_idx" ON "Handoff"("leadId");

-- CreateIndex
CREATE INDEX "PexEvent_leadId_idx" ON "PexEvent"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "PexEvent_pexBookingId_eventType_key" ON "PexEvent"("pexBookingId", "eventType");

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PexEvent" ADD CONSTRAINT "PexEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
