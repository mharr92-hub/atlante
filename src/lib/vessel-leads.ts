/**
 * Leads de charter (bloque 4.2).
 *
 * Dos cierres, un solo endpoint (`POST /api/leads`):
 *   - `closeMode = "deeplink"` (naves de PEX) → lead `charter_pex` en estado
 *     `created` y `destinationUrl` al checkout de PEX con `ref=ATLANTE`;
 *   - `closeMode = "quote"` (naves aliadas) → lead `charter_partner` en estado
 *     `quote_requested`, sin destino: cierra el concierge por WhatsApp.
 *
 * El tipo y el estado los decide el servidor a partir de la nave: el cliente no
 * puede pedir uno u otro. Y como en la ticketería, si la base de datos no está
 * el handoff sigue igual, sin `ref_id` (regla 9).
 */
import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { OCCASIONS, type Vessel } from "@/content/vessels";
import { vesselDestination } from "@/lib/destination";
import { getDb } from "@/lib/db";
import { cleanEmail, cleanName, LeadValidationError, normalizePhone } from "@/lib/leads";
import { notifyNewLead } from "@/lib/notify";
import { normalizePartnerCode, pickPartnerCode } from "@/lib/partner-codes";
import { resolvePartnerCode } from "@/lib/partners";
import { durationsOf, rowForGroup } from "@/lib/vessel-pricing";
import { getVessel } from "@/lib/vessels";
import type { Attribution } from "@/lib/attribution";

/** Minutos de vida del token de handoff (PRD 5.4), igual que en la ticketería. */
const HANDOFF_TTL_MIN = 30;

export interface VesselLeadInput {
  vesselSlug: string;
  /** `YYYY-MM-DD` de la fecha deseada. */
  date?: string;
  /** Jornada pedida, en horas (4 / 8 / 12). */
  hours?: number;
  people: number;
  occasion?: string;
  name: string;
  email: string;
  phone: string;
  partnerCode?: string;
  accepted: boolean;
}

export interface VesselLeadResult {
  leadId: string | null;
  handoffToken: string | null;
  /** Sólo en `deeplink`; en `quote` el cierre es por WhatsApp. */
  destinationUrl: string | null;
  /** Precio del barco completo del tramo que cubre al grupo, si existe. */
  estimate: number | null;
  closeMode: Vessel["closeMode"];
}

// ------------------------------------------------------------ validación ----

/** Fecha ISO, no más de un día en el pasado. Las naves no tienen calendario. */
function cleanDate(raw: unknown): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new LeadValidationError("date", "fecha inválida");

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) throw new LeadValidationError("date", "fecha inválida");

  // Un día de holgura: el cliente está en Panamá (UTC-5) y el servidor en UTC.
  const floor = new Date();
  floor.setHours(0, 0, 0, 0);
  floor.setDate(floor.getDate() - 1);
  if (date < floor) throw new LeadValidationError("date", "la fecha ya pasó");

  return value;
}

function cleanHours(vessel: Vessel, raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const hours = Math.trunc(Number(raw));
  const published = durationsOf(vessel);
  if (!Number.isFinite(hours) || !published.includes(hours)) {
    throw new LeadValidationError("hours", "esa jornada no está publicada");
  }
  return hours;
}

function cleanPeople(vessel: Vessel, raw: unknown): number {
  const people = Math.trunc(Number(raw));
  if (!Number.isFinite(people) || people < 1 || people > vessel.capacityMax) {
    throw new LeadValidationError("pax", "cantidad de personas fuera de la capacidad");
  }
  return people;
}

function cleanOccasion(raw: unknown): string | undefined {
  const value = typeof raw === "string" ? raw.trim() : "";
  return (OCCASIONS as readonly string[]).includes(value) ? value : undefined;
}

/** Cuerpo JSON crudo → `VesselLeadInput` validado + la nave. */
export async function parseVesselLeadInput(
  body: unknown,
): Promise<{ input: VesselLeadInput; vessel: Vessel }> {
  const raw = (body ?? {}) as Record<string, unknown>;

  const slug = typeof raw.vessel === "string" ? raw.vessel : "";
  const vessel = await getVessel(slug);
  if (!vessel || !vessel.active) {
    throw new LeadValidationError("vessel", "nave no disponible");
  }

  if (raw.accepted !== true) {
    throw new LeadValidationError("accepted", "falta la autorización de transferencia de datos");
  }

  const phone = normalizePhone(String(raw.phone ?? ""));
  if (!phone) throw new LeadValidationError("phone", "WhatsApp inválido");

  const input: VesselLeadInput = {
    vesselSlug: vessel.slug,
    date: cleanDate(raw.date) ?? undefined,
    hours: cleanHours(vessel, raw.hours),
    people: cleanPeople(vessel, raw.people ?? raw.pax),
    occasion: cleanOccasion(raw.occasion),
    name: cleanName(String(raw.name ?? "")),
    email: cleanEmail(String(raw.email ?? "")),
    phone,
    // Sólo se normaliza: la validación contra `Reseller` ocurre al guardar,
    // porque necesita la base de datos (bloque 5.1).
    partnerCode: normalizePartnerCode(raw.partnerCode) ?? undefined,
    accepted: true,
  };

  return { input, vessel };
}

// ------------------------------------------------------------ persistencia --

/** Precio publicado del tramo que cubre al grupo, o `null` si no hay ninguno. */
export function estimateFor(vessel: Vessel, input: VesselLeadInput): number | null {
  const row = rowForGroup(vessel, { people: input.people, hours: input.hours ?? null });
  return row ? row.price : null;
}

/**
 * Guarda el lead de charter y, en modo `deeplink`, devuelve el destino en PEX.
 *
 * Sin base de datos (o si falla) devuelve `leadId: null` y una URL sin `ref_id`:
 * el salto al checkout de PEX nunca se bloquea (regla 9 / criterio A5).
 */
export async function createVesselLead(
  input: VesselLeadInput,
  vessel: Vessel,
  attribution: Attribution,
): Promise<VesselLeadResult> {
  const deeplink = vessel.closeMode === "deeplink";
  const estimate = estimateFor(vessel, input);
  const db = getDb();

  const withoutDb = (): VesselLeadResult => ({
    leadId: null,
    handoffToken: null,
    destinationUrl: deeplink ? vesselDestination(vessel) : null,
    estimate,
    closeMode: vessel.closeMode,
  });

  if (!db) {
    console.warn("[leads] sin DB");
    return withoutDb();
  }

  try {
    // El código del formulario manda sobre el de la cookie, y sólo se guarda si
    // hay un `Reseller` activo con ese código; si no, se ignora sin error.
    const partnerCode = await resolvePartnerCode(
      pickPartnerCode(input.partnerCode, attribution.partnerCode),
    );

    const token = randomBytes(32).toString("hex");
    const lead = await db.lead.create({
      data: {
        type: deeplink ? "charter_pex" : "charter_partner",
        status: deeplink ? "created" : "quote_requested",
        vesselSlug: vessel.slug,
        serviceDate: input.date ? new Date(`${input.date}T00:00:00.000Z`) : null,
        hours: input.hours ?? null,
        occasion: input.occasion ?? null,
        paxTotal: input.people,
        pax: { personas: input.people } as Prisma.InputJsonValue,
        name: input.name,
        email: input.email,
        phone: input.phone,
        partnerCode,
        utmSource: attribution.utmSource ?? null,
        utmMedium: attribution.utmMedium ?? null,
        utmCampaign: attribution.utmCampaign ?? null,
        landingPath: attribution.landingPath ?? null,
      },
      select: { id: true },
    });

    const destinationUrl = deeplink
      ? vesselDestination(vessel, { leadId: lead.id, handoffToken: token })
      : null;

    // El handoff sólo tiene sentido en `deeplink`: es PEX quien lo resuelve.
    if (deeplink) {
      await db.$transaction([
        db.lead.update({ where: { id: lead.id }, data: { destinationUrl } }),
        db.handoff.create({
          data: {
            token,
            leadId: lead.id,
            expiresAt: new Date(Date.now() + HANDOFF_TTL_MIN * 60_000),
          },
        }),
      ]);
    }

    await notifyNewLead({
      leadId: lead.id,
      productSlug: vessel.slug,
      productName: vessel.name,
      serviceDate: input.date ?? null,
      timeSlot: input.hours ? `${input.hours} h` : null,
      paxTotal: input.people,
      total: estimate ?? 0,
      mode: deeplink ? "charter" : "cotizacion",
    });

    return {
      leadId: lead.id,
      handoffToken: deeplink ? token : null,
      destinationUrl,
      estimate,
      closeMode: vessel.closeMode,
    };
  } catch {
    // Sin PII en el log: sólo que la escritura no fue posible.
    console.warn("[leads] sin DB");
    return withoutDb();
  }
}
