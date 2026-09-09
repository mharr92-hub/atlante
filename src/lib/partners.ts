/**
 * Códigos de aliado (bloque 5.1) — la parte que toca la base de datos.
 *
 * `Reseller` es el modelo que ya existía (nombre, correo, `referralCode`,
 * `commissionPercent`, `active`); el bloque 5 le añadió `kind`, `whatsapp` y
 * `notes`. La lógica de qué código se acepta vive en `lib/partner-codes.ts`,
 * que es pura y está probada; aquí sólo se consulta.
 *
 * Regla 9: sin base de datos nada revienta. `resolvePartnerCode()` devuelve
 * `null` (el código se ignora) y el lead se guarda igual.
 */
import "server-only";
import { acceptPartnerCode, normalizePartnerCode } from "@/lib/partner-codes";
import { getDb } from "@/lib/db";

/** Datos de un aliado que necesita el reporte de comisiones. */
export interface PartnerInfo {
  code: string;
  name: string;
  kind: string;
  /** `Reseller.commissionPercent`: la parte del aliado sobre el monto. */
  commissionPercent: number;
  active: boolean;
}

/**
 * Devuelve el código sólo si existe un `Reseller` **activo** con ese código.
 *
 * Un código inexistente, desactivado o escrito de más se ignora sin error: el
 * lead se guarda sin aliado (bloque 5.1). Sin base de datos también devuelve
 * `null`, pero en ese caso tampoco hay lead que guardar.
 */
export async function resolvePartnerCode(candidate: unknown): Promise<string | null> {
  const code = normalizePartnerCode(candidate);
  if (!code) return null;

  const db = getDb();
  if (!db) return null;

  try {
    const record = await db.reseller.findUnique({
      where: { referralCode: code },
      select: { referralCode: true, active: true },
    });
    return acceptPartnerCode(code, record);
  } catch {
    // Sin PII en el log: sólo que no se pudo validar el código.
    console.warn("[aliados] no se pudo validar el codigo de aliado");
    return null;
  }
}

/**
 * Todos los aliados, por código, para el reparto de `/admin/comisiones`.
 * Devuelve un mapa vacío si no hay base de datos o si la consulta falla.
 */
export async function partnerDirectory(): Promise<Map<string, PartnerInfo>> {
  const db = getDb();
  const directory = new Map<string, PartnerInfo>();
  if (!db) return directory;

  try {
    const rows = await db.reseller.findMany({
      orderBy: { referralCode: "asc" },
      take: 2000,
      select: {
        referralCode: true,
        name: true,
        kind: true,
        commissionPercent: true,
        active: true,
      },
    });

    for (const row of rows) {
      directory.set(row.referralCode, {
        code: row.referralCode,
        name: row.name,
        kind: row.kind,
        commissionPercent: Number(row.commissionPercent ?? 0),
        active: row.active,
      });
    }
  } catch {
    console.warn("[aliados] no se pudo leer la tabla de aliados");
  }

  return directory;
}
