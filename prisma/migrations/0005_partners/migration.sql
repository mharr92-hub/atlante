-- 0005_partners — R3: códigos de aliado.
--
-- Generada con:
--   prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma \
--                       --to-schema-datamodel prisma/schema.prisma --script
-- (`schema.base.prisma` = `prisma/schema.prisma` en el commit anterior; se borró
-- después de generar el diff). NO se ejecutó contra ninguna base de datos.
--
-- Todo es aditivo: tres columnas nullable (o con valor por defecto) sobre
-- `Reseller` y un índice. No borra ni cambia ninguna columna existente, así que
-- se puede aplicar sobre una base con datos.

-- AlterTable
ALTER TABLE "Reseller" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'hotel',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateIndex
CREATE INDEX "Reseller_active_idx" ON "Reseller"("active");
