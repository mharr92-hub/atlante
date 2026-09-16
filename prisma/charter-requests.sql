-- Additive migration for existing Atlante databases (charter MVP).
-- Greenfield installs can use initial-schema.sql instead.
-- Apply with: psql "$DATABASE_URL" -f prisma/charter-requests.sql
-- or: npx prisma db push

ALTER TYPE "BookingFlow" ADD VALUE IF NOT EXISTS 'paguelofacil_checkout';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'paguelofacil';

DO $$ BEGIN
  CREATE TYPE "CharterConfirmation" AS ENUM ('awaiting', 'confirmed', 'declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CharterRequest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "durationId" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "bookingDate" DATE NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerWhatsapp" TEXT NOT NULL,
    "sampleTotalUsd" DECIMAL(10,2),
    "depositAmount" DECIMAL(10,2) NOT NULL,
    "depositPercent" INTEGER NOT NULL DEFAULT 30,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "charterConfirmation" "CharterConfirmation" NOT NULL DEFAULT 'awaiting',
    "confirmationToken" TEXT NOT NULL,
    "paguelofacilLinkCode" TEXT,
    "paguelofacilOperationId" TEXT,
    "paymentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharterRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CharterRequest_confirmationToken_key"
  ON "CharterRequest"("confirmationToken");
CREATE INDEX IF NOT EXISTS "CharterRequest_slug_bookingDate_idx"
  ON "CharterRequest"("slug", "bookingDate");
CREATE INDEX IF NOT EXISTS "CharterRequest_paymentStatus_status_idx"
  ON "CharterRequest"("paymentStatus", "status");
