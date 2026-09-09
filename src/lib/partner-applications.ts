/**
 * Alta de aliados (bloque 4.2): operadores de charter, hoteles y concierges, y
 * agencias. El formulario de `/aliados/registro` escribe aquí.
 *
 * Como todo en Atlante, sin base de datos no revienta: se responde
 * `{ ok: true, saved: false }` y el formulario ofrece cerrar por WhatsApp, para
 * no perder al aliado por una caída de Postgres (regla 9).
 */
import "server-only";
import { getDb } from "@/lib/db";
import { cleanEmail, LeadValidationError, normalizePhone } from "@/lib/leads";

/** Las tres propuestas de `/aliados`. */
export const PARTNER_KINDS = ["operator", "hotel", "agency"] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];

export const PARTNER_STATUSES = ["new", "reviewing", "approved", "rejected"] as const;

export interface PartnerApplicationInput {
  kind: PartnerKind;
  name: string;
  vesselName?: string;
  capacity?: number;
  zone?: string;
  whatsapp: string;
  email?: string;
  photos: string[];
  message?: string;
}

function text(raw: unknown, max: number): string {
  return String(raw ?? "").trim().slice(0, max);
}

/** Cuerpo JSON crudo → solicitud validada. */
export function parsePartnerApplication(body: unknown): PartnerApplicationInput {
  const raw = (body ?? {}) as Record<string, unknown>;

  const kindRaw = text(raw.kind, 20);
  const kind = (PARTNER_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as PartnerKind)
    : "operator";

  const name = text(raw.name, 120);
  if (name.length < 2) throw new LeadValidationError("name", "falta el nombre");

  const whatsapp = normalizePhone(String(raw.whatsapp ?? ""));
  if (!whatsapp) throw new LeadValidationError("whatsapp", "WhatsApp inválido");

  const emailRaw = text(raw.email, 160);
  const email = emailRaw ? cleanEmail(emailRaw) : undefined;

  const capacityRaw = Math.trunc(Number(raw.capacity));
  const capacity =
    Number.isFinite(capacityRaw) && capacityRaw > 0 && capacityRaw <= 1000
      ? capacityRaw
      : undefined;

  const photos = String(raw.photos ?? "")
    .split(/[\n,]/)
    .map((line) => line.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 10);

  return {
    kind,
    name,
    vesselName: text(raw.vesselName, 120) || undefined,
    capacity,
    zone: text(raw.zone, 120) || undefined,
    whatsapp,
    email,
    photos,
    message: text(raw.message, 2000) || undefined,
  };
}

/** Guarda la solicitud. `saved: false` cuando no hay base de datos. */
export async function createPartnerApplication(
  input: PartnerApplicationInput,
): Promise<{ saved: boolean }> {
  const db = getDb();
  if (!db) {
    console.warn("[aliados] sin DB");
    return { saved: false };
  }

  try {
    await db.partnerApplication.create({
      data: {
        kind: input.kind,
        name: input.name,
        vesselName: input.vesselName ?? null,
        capacity: input.capacity ?? null,
        zone: input.zone ?? null,
        whatsapp: input.whatsapp,
        email: input.email ?? null,
        photos: input.photos,
        message: input.message ?? null,
      },
    });
    return { saved: true };
  } catch {
    // Sin PII en el log: sólo que la escritura no fue posible.
    console.warn("[aliados] sin DB");
    return { saved: false };
  }
}
