"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { slugifyKey, parseNumber } from "@/lib/catalog-forms";
import {
  normalizePartnerCode,
  RESELLER_KINDS,
  suggestPartnerCode,
  type ResellerKind,
} from "@/lib/partner-codes";
import { PARTNER_STATUSES } from "@/lib/partner-applications";

/**
 * Admin de aliados (bloque 5.1): alta manual de códigos (`Reseller`) y revisión
 * de las solicitudes que llegan de `/aliados/registro` (`PartnerApplication`).
 *
 * Aprobar una solicitud crea la ficha que corresponde a su tipo: un operador de
 * charter se convierte en `Operator` (para poder colgarle naves) y un hotel, una
 * agencia o un organizador en `Reseller` (para darle un código). Ni una ni otra
 * publican nada por sí solas: la nave se carga a mano en `/admin/naves`.
 *
 * El porcentaje del aliado nace en 0: no hay reparto por defecto acordado
 * (PENDIENTE MARK) y no se inventa uno.
 */

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

function refresh() {
  revalidatePath("/admin/aliados");
  revalidatePath("/admin/comisiones");
}

function kindOf(raw: string): ResellerKind {
  return (RESELLER_KINDS as readonly string[]).includes(raw) ? (raw as ResellerKind) : "hotel";
}

/** Un código libre a partir de uno sugerido: `HOTELX`, `HOTELX2`, `HOTELX3`… */
async function freeCode(
  db: NonNullable<ReturnType<typeof getDb>>,
  suggested: string,
): Promise<string | null> {
  const base = normalizePartnerCode(suggested);
  if (!base) return null;

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 20)}${i + 1}`;
    const taken = await db.reseller.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return null;
}

// ------------------------------------------------- códigos de aliado --------

/**
 * Alta o edición de un `Reseller`. El código se guarda siempre en mayúsculas y
 * es la clave: cambiarlo crea otro aliado, no renombra el existente.
 */
export async function saveResellerAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const code = normalizePartnerCode(text(formData, "referralCode"));
  const name = text(formData, "name").trim().slice(0, 120);
  if (!code || !name) return;

  const email = text(formData, "email").trim().toLowerCase().slice(0, 160);
  if (!email) return;

  const data = {
    name,
    email,
    kind: kindOf(slugifyKey(text(formData, "kind"))),
    whatsapp: text(formData, "whatsapp").replace(/\D+/g, "").slice(0, 20) || null,
    notes: text(formData, "notes").trim().slice(0, 2000) || null,
    commissionPercent: new Prisma.Decimal(
      parseNumber(formData.get("commissionPercent"), 0, 100) ?? 0,
    ),
    active: formData.get("active") === "on",
  };

  try {
    await db.reseller.upsert({
      where: { referralCode: code },
      create: { referralCode: code, ...data },
      update: data,
    });
  } catch {
    // Correo repetido (es único en `Reseller`): no se guarda y no se rompe.
    console.warn("[aliados] no se pudo guardar el aliado");
  }

  refresh();
}

export async function toggleResellerAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const code = normalizePartnerCode(text(formData, "referralCode"));
  if (!code) return;

  await db.reseller.updateMany({
    where: { referralCode: code },
    data: { active: formData.get("active") === "on" },
  });
  refresh();
}

/**
 * Borrado real. Los leads guardan `partnerCode` como texto: borrar el aliado no
 * los pierde, pero su reparto pasa a mostrarse como "—" en el reporte. Para
 * dejar de contarlo sin perder el histórico, mejor desactivarlo.
 */
export async function deleteResellerAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const code = normalizePartnerCode(text(formData, "referralCode"));
  if (!code) return;

  await db.reseller.deleteMany({ where: { referralCode: code } });
  refresh();
}

// ------------------------------------------------------- solicitudes --------

export async function setPartnerStatusAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const id = text(formData, "id").trim();
  const status = text(formData, "status").trim();
  if (!id || !(PARTNER_STATUSES as readonly string[]).includes(status)) return;

  await db.partnerApplication.update({ where: { id }, data: { status } });
  refresh();
}

export async function deletePartnerApplicationAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const id = text(formData, "id").trim();
  if (!id) return;

  await db.partnerApplication.delete({ where: { id } });
  refresh();
}

/**
 * Aprobar: crea `Operator` (solicitudes de operador de charter) o `Reseller`
 * (hotel, agencia u organizador) y marca la solicitud como `approved`.
 *
 * Es idempotente: si la ficha ya existe no la pisa, sólo mueve el estado.
 */
export async function approvePartnerApplicationAction(formData: FormData) {
  await requireAdmin();
  const db = getDb();
  if (!db) return;

  const id = text(formData, "id").trim();
  if (!id) return;

  const application = await db.partnerApplication.findUnique({ where: { id } });
  if (!application) return;

  if (application.kind === "operator") {
    const slug = slugifyKey(application.name).slice(0, 40);
    if (slug) {
      const existing = await db.operator.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existing) {
        await db.operator.create({
          data: {
            slug,
            name: application.name,
            whatsapp: application.whatsapp || null,
            email: application.email,
            // Sin comisión: manda `ATLANTE_COMMISSION_PCT` hasta que Mark la fije.
            verified: false,
            active: true,
          },
        });
      }
    }
    revalidatePath("/admin/operadores");
  } else {
    const code = await freeCode(db, suggestPartnerCode(application.name));
    // Sin correo no se puede crear el `Reseller` (es único y obligatorio): la
    // solicitud queda aprobada y el código se da de alta a mano más abajo.
    if (code && application.email) {
      const existing = await db.reseller.findUnique({
        where: { email: application.email },
        select: { id: true },
      });
      if (!existing) {
        await db.reseller.create({
          data: {
            referralCode: code,
            name: application.name,
            email: application.email,
            kind: kindOf(application.kind),
            whatsapp: application.whatsapp || null,
            notes: application.message || null,
            // 0 %: el reparto lo fija Mark (PENDIENTE MARK), no se inventa.
            commissionPercent: new Prisma.Decimal(0),
            active: true,
          },
        });
      }
    }
  }

  await db.partnerApplication.update({ where: { id }, data: { status: "approved" } });
  refresh();
}
