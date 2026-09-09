/**
 * Códigos de aliado (bloque 5.1) — la parte pura.
 *
 * Un aliado (hotel, concierge, agencia, organizador u operador) recomienda
 * Atlante con su propio código. El código entra por `?partner=CODE` —o por
 * `?ref=CODE` en rutas de Atlante—, vive 30 días en la cookie `atl_partner` y
 * termina en `Lead.partnerCode`.
 *
 * Aquí no hay Prisma ni `server-only` a propósito: lo comparten el proxy (edge),
 * las APIs (servidor), el admin y los tests. La consulta contra `Reseller` vive
 * en `src/lib/partners.ts`.
 *
 * A Pacific Experience nunca le llega este código: PEX sólo conoce
 * `ref=ATLANTE`. El reparto se calcula en `/admin/comisiones`.
 */

/** Los cuatro tipos de aliado del bloque 5.1. */
export const RESELLER_KINDS = ["hotel", "agency", "organizer", "operator"] as const;
export type ResellerKind = (typeof RESELLER_KINDS)[number];

export const RESELLER_KIND_LABEL: Record<ResellerKind, string> = {
  hotel: "Hotel o concierge",
  agency: "Agencia o DMC",
  organizer: "Organizador de eventos",
  operator: "Operador de charter",
};

/** Longitud máxima del código; `Lead.partnerCode` acepta bastante más. */
export const PARTNER_CODE_MAX = 24;

/**
 * Códigos que nunca pertenecen a un aliado.
 *
 * `ATLANTE` es el código que Atlante usa en PEX: si alguien vuelve de PEX con
 * `?ref=ATLANTE` pegado en la URL, eso no es un aliado.
 */
const RESERVED = new Set(["ATLANTE"]);

/**
 * Normaliza un código: mayúsculas, sin espacios ni acentos y sólo con los
 * caracteres que sobreviven a una URL escrita a mano. Devuelve `null` si lo que
 * queda no puede ser un código.
 */
export function normalizePartnerCode(raw: unknown): string | null {
  const code = String(raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, "")
    .slice(0, PARTNER_CODE_MAX);

  if (code.length < 2) return null;
  if (RESERVED.has(code)) return null;
  return code;
}

/** El código del formulario manda sobre el de la cookie. */
export function pickPartnerCode(
  fromForm: unknown,
  fromCookie: unknown,
): string | null {
  return normalizePartnerCode(fromForm) ?? normalizePartnerCode(fromCookie);
}

/** Lo mínimo que hace falta de un `Reseller` para aceptar su código. */
export interface PartnerRecord {
  referralCode: string;
  active: boolean;
}

/**
 * Decide si el código se guarda en el lead.
 *
 * Sólo si existe un `Reseller` activo con ese código exacto. Un código que no
 * existe, uno desactivado o uno de otro aliado se ignora **sin error**: el lead
 * se guarda igual y el handoff a PEX sigue (bloque 5.1).
 */
export function acceptPartnerCode(
  candidate: string | null | undefined,
  record: PartnerRecord | null | undefined,
): string | null {
  const code = normalizePartnerCode(candidate);
  if (!code || !record || !record.active) return null;
  return normalizePartnerCode(record.referralCode) === code ? code : null;
}

/**
 * Enlace de invitación del aliado: `https://…/?partner=CODE`.
 *
 * Es el enlace que el hotel pega en su web, en su WhatsApp o en una tarjeta de
 * la habitación. `base` es `site.url`; se pasa por parámetro para no arrastrar
 * la configuración del sitio al edge ni a los tests.
 */
export function partnerInviteUrl(code: string, base: string): string {
  const normalized = normalizePartnerCode(code);
  const root = base.replace(/\/+$/, "");
  return normalized ? `${root}/?partner=${normalized}` : `${root}/`;
}

/**
 * Código sugerido a partir del nombre del aliado, para el alta manual y para
 * aprobar una solicitud. Nunca es único por sí solo: quien lo guarda comprueba
 * la colisión (`Reseller.referralCode` es único).
 */
export function suggestPartnerCode(name: string): string {
  const base = String(name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 12);
  return base.length >= 2 ? base : "";
}
