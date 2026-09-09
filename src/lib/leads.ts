import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Product } from "@/content/catalog";
import { getProduct, getProductSlots } from "@/lib/catalog";
import { computeTotal, decodePax, maxPax, minPax, paxTotal, priceRows, type Pax } from "@/lib/funnel";
import { findSlot, slotsAreFresh, type SlotOption } from "@/lib/slots";
import { buildPexUrl } from "@/lib/pex";
import { getDb } from "@/lib/db";
import { notifyNewLead } from "@/lib/notify";
import type { Attribution } from "@/lib/attribution";

/** Minutos de vida del token de handoff (PRD 5.4). */
const HANDOFF_TTL_MIN = 30;

export interface LeadInput {
  slug: string;
  date?: string;
  timeSlot?: string;
  /** `ProductSlot.pexSlotId` elegido en modo integrado. */
  slotId?: string;
  pax: Pax;
  addons: string[];
  name: string;
  email: string;
  phone: string;
  partnerCode?: string;
  accepted: boolean;
}

export interface LeadResult {
  leadId: string | null;
  handoffToken: string | null;
  destinationUrl: string;
  total: number;
}

export class LeadValidationError extends Error {
  constructor(readonly field: string, message: string) {
    super(message);
    this.name = "LeadValidationError";
  }
}

// ------------------------------------------------------------ validación ----

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Normaliza a E.164 sin `+`. Un número de 8 dígitos se asume panameño. */
export function normalizePhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D+/g, "");
  if (!digits) return null;
  const e164 = digits.length === 8 ? `507${digits}` : digits;
  if (e164.length < 8 || e164.length > 15) return null;
  return e164;
}

function cleanName(raw: string): string {
  const name = (raw ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 120) {
    throw new LeadValidationError("name", "nombre inválido");
  }
  if (name.split(" ").filter((w) => w.length > 0).length < 2) {
    throw new LeadValidationError("name", "hacen falta nombre y apellido");
  }
  return name;
}

function cleanEmail(raw: string): string {
  const email = (raw ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 160) {
    throw new LeadValidationError("email", "correo inválido");
  }
  return email;
}

/** Sólo categorías del catálogo, enteros y dentro de la capacidad publicada. */
function cleanPax(product: Product, raw: Pax): Pax {
  const valid = new Set(priceRows(product).map((r) => r.key));
  const pax: Pax = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (!valid.has(key)) continue;
    const n = Math.trunc(Number(value));
    if (Number.isFinite(n) && n > 0) pax[key] = n;
  }

  const total = paxTotal(pax);
  if (total < minPax(product) || total > maxPax(product)) {
    throw new LeadValidationError("pax", "cantidad de pasajeros fuera de rango");
  }
  return pax;
}

/** Formato ISO, día de salida publicado y no más de un día en el pasado. */
function cleanDate(product: Product, raw: string | undefined): string | null {
  if (!raw) {
    // Sólo los productos sin calendario pueden venir sin fecha.
    if (product.schedule) throw new LeadValidationError("date", "falta la fecha");
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) throw new LeadValidationError("date", "fecha inválida");

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) throw new LeadValidationError("date", "fecha inválida");

  // Un día de holgura: el cliente está en Panamá (UTC-5) y el servidor en UTC.
  const floor = new Date();
  floor.setHours(0, 0, 0, 0);
  floor.setDate(floor.getDate() - 1);
  if (date < floor) throw new LeadValidationError("date", "la fecha ya pasó");

  const weekdays = product.schedule?.weekdays;
  if (weekdays && weekdays.length > 0 && !weekdays.includes(date.getDay())) {
    throw new LeadValidationError("date", "ese día no tiene salida publicada");
  }
  return raw;
}

function cleanAddons(product: Product, raw: string[] | undefined): string[] {
  const active = new Set((product.addons ?? []).filter((a) => a.active).map((a) => a.slug));
  return (raw ?? []).filter((slug) => active.has(slug));
}

/**
 * Resuelve el `slotId` del modo integrado contra el snapshot del feed.
 *
 * Devuelve `null` (modo puente) si no llega `slotId` o si el snapshot no sirve
 * — sin feed, sin base de datos o con más de 24 h — para que el handoff nunca
 * dependa de la sincronización. Si el `slotId` sí llega y el snapshot está
 * fresco, la salida tiene que existir y tener cupo.
 */
async function resolveSlot(
  product: Product,
  rawSlotId: unknown,
  pax: Pax,
): Promise<SlotOption | null> {
  const slotId = typeof rawSlotId === "string" ? rawSlotId.trim().slice(0, 120) : "";
  if (!slotId) return null;

  const { slots, syncedAt } = await getProductSlots(product.slug);
  if (!slotsAreFresh(slots, syncedAt)) return null;

  const slot = findSlot(slots, slotId);
  if (!slot) throw new LeadValidationError("slot", "esa salida ya no está publicada");
  if (paxTotal(pax) > slot.capacityRemaining) {
    throw new LeadValidationError("slot", "no hay cupo suficiente en esa salida");
  }
  return slot;
}

/** Convierte el cuerpo JSON crudo en un `LeadInput` validado. */
export async function parseLeadInput(
  body: unknown,
): Promise<{ input: LeadInput; product: Product; slot: SlotOption | null }> {
  const raw = (body ?? {}) as Record<string, unknown>;

  const slug = typeof raw.slug === "string" ? raw.slug : "";
  const product = await getProduct(slug);
  if (!product || !product.available) {
    throw new LeadValidationError("slug", "producto no disponible");
  }

  if (raw.accepted !== true) {
    throw new LeadValidationError("accepted", "falta la autorización de transferencia de datos");
  }

  const phone = normalizePhone(String(raw.phone ?? ""));
  if (!phone) throw new LeadValidationError("phone", "WhatsApp inválido");

  const paxRaw =
    typeof raw.pax === "string"
      ? decodePax(raw.pax, product)
      : ((raw.pax ?? {}) as Pax);
  const pax = cleanPax(product, paxRaw);

  const slot = await resolveSlot(product, raw.slotId, pax);

  // Con salida real manda el feed: su fecha y su hora, sin pasar por el
  // calendario de `schedule` (el feed puede publicar días que el horario fijo
  // del catálogo no contempla).
  const date = slot
    ? slot.date
    : (cleanDate(product, typeof raw.date === "string" ? raw.date : undefined) ?? undefined);
  const timeSlot = slot
    ? slot.start
    : typeof raw.timeSlot === "string"
      ? raw.timeSlot.slice(0, 20)
      : undefined;

  const input: LeadInput = {
    slug: product.slug,
    date,
    timeSlot,
    slotId: slot?.id,
    pax,
    addons: cleanAddons(product, Array.isArray(raw.addons) ? (raw.addons as string[]) : []),
    name: cleanName(String(raw.name ?? "")),
    email: cleanEmail(String(raw.email ?? "")),
    phone,
    partnerCode:
      typeof raw.partnerCode === "string" && raw.partnerCode.trim()
        ? raw.partnerCode.trim().slice(0, 40)
        : undefined,
    accepted: true,
  };

  return { input, product, slot };
}

// --------------------------------------------------------------- destino ----

/** `trip_id` de PEX del producto, o `null` si es una nave o no se conoce. */
function tripIdOf(product: Product): string | null {
  return product.pexCheckout?.kind === "tour" ? product.pexCheckout.tripId : null;
}

/**
 * A dónde se manda a la persona.
 *
 * Modo integrado (3.3): con salida real del feed y `trip_id` conocido, deep link
 * directo al checkout de PEX con `slot_id`, `date` y `tickets`.
 * Modo puente: la página del producto (o el checkout de la nave), como en R1.
 */
export function destinationFor(
  product: Product,
  addons: string[],
  leadId?: string,
  handoffToken?: string,
  slot?: SlotOption | null,
  tickets?: number,
): string {
  const isCharter = product.kind === "charter_pex";
  const tripId = tripIdOf(product);

  if (!isCharter && slot && tripId) {
    return buildPexUrl({
      target: "tour_checkout",
      tripId,
      slotId: slot.id,
      date: slot.date,
      tickets,
      addons,
      leadId,
      handoffToken,
      campaign: product.slug,
    });
  }

  return buildPexUrl({
    target: isCharter ? "charter_checkout" : "tour_page",
    path: product.pexPath,
    vessel:
      product.pexCheckout?.kind === "charter" ? product.pexCheckout.vessel : undefined,
    addons,
    leadId,
    handoffToken,
    campaign: product.slug,
  });
}

const TYPE_BY_KIND = {
  tour: "tour",
  party: "party",
  ferry: "ferry",
  charter_pex: "charter_pex",
} as const;

// ------------------------------------------------------------ persistencia --

/**
 * Guarda el lead y su handoff, y devuelve a dónde mandar a la persona.
 *
 * Si no hay base de datos (o falla), NO revienta: devuelve `leadId: null` y una
 * URL sin `ref_id`. El handoff a PEX nunca se bloquea porque la DB esté caída
 * (regla 9 / criterio A5).
 */
export async function createLead(
  input: LeadInput,
  product: Product,
  attribution: Attribution,
  slot: SlotOption | null = null,
): Promise<LeadResult> {
  const total = computeTotal(product, input.pax, input.addons);
  const people = paxTotal(input.pax);
  const db = getDb();

  if (!db) {
    console.warn("[leads] sin DB");
    return {
      leadId: null,
      handoffToken: null,
      destinationUrl: destinationFor(product, input.addons, undefined, undefined, slot, people),
      total,
    };
  }

  try {
    const token = randomBytes(32).toString("hex");
    const data: Prisma.LeadCreateInput = {
      type: TYPE_BY_KIND[product.kind],
      productSlug: product.kind === "charter_pex" ? null : product.slug,
      vesselSlug: product.kind === "charter_pex" ? product.slug : null,
      serviceDate: input.date ? new Date(`${input.date}T00:00:00.000Z`) : null,
      timeSlot: input.timeSlot ?? null,
      pexSlotId: input.slotId ?? null,
      pax: input.pax as Prisma.InputJsonValue,
      paxTotal: people,
      addons: input.addons as Prisma.InputJsonValue,
      name: input.name,
      email: input.email,
      phone: input.phone,
      partnerCode: input.partnerCode ?? attribution.partnerCode ?? null,
      utmSource: attribution.utmSource ?? null,
      utmMedium: attribution.utmMedium ?? null,
      utmCampaign: attribution.utmCampaign ?? null,
      landingPath: attribution.landingPath ?? null,
      amount: null,
    };

    const lead = await db.lead.create({ data, select: { id: true } });
    const destinationUrl = destinationFor(
      product,
      input.addons,
      lead.id,
      token,
      slot,
      people,
    );

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

    // Aviso al concierge (3.4). Nunca bloquea ni rompe el handoff.
    await notifyNewLead({
      leadId: lead.id,
      productSlug: product.slug,
      productName: product.name.es,
      serviceDate: input.date ?? null,
      timeSlot: input.timeSlot ?? null,
      paxTotal: people,
      total,
      mode: slot ? "integrado" : "puente",
    });

    return { leadId: lead.id, handoffToken: token, destinationUrl, total };
  } catch {
    // Sin PII en el log: sólo que la escritura no fue posible.
    console.warn("[leads] sin DB");
    return {
      leadId: null,
      handoffToken: null,
      destinationUrl: destinationFor(product, input.addons, undefined, undefined, slot, people),
      total,
    };
  }
}
