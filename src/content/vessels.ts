/**
 * Marketplace de charters — respaldo en código de `Operator` y `Vessel`.
 *
 * Mismo patrón que `src/content/catalog.ts`: `src/lib/vessels.ts` lee de la base
 * de datos cuando hay filas y cae aquí cuando no, para que `/charters` siga en
 * pie sin `DATABASE_URL` (regla 9).
 *
 * Regla 3: aquí no se inventa nada. Las tres naves son las de Pacific Experience
 * con los datos publicados el 09/09/2026 (bloque 2, sección 2.1). Lo que PEX no
 * publica —eslora, tipo del Sirena del Mar, licencia AMP, seguro, contrato— se
 * queda vacío y viaja al reporte como PENDIENTE MARK. No hay operadores ni naves
 * aliadas: cuando existan, entran por `/aliados/registro` y `/admin/naves`.
 *
 * `sourceUrl` es un DATO, no un enlace: cualquier `href` a PEX pasa por
 * `buildPexUrl()` (`src/lib/pex.ts`).
 */

import type { Localized } from "@/content/catalog";

export type { Localized };

/** Cómo cierra la nave: checkout de PEX con `ref`, o cotización de Atlante. */
export type CloseMode = "deeplink" | "quote";

/** Una fila de la tabla de precios: ruta · duración · capacidad · barco completo. */
export interface PricingRow {
  /** Clave de ruta (`bahia`, `taboga`, `perlas`). */
  route: string;
  /** Horas de la jornada: 4, 8 o 12. */
  hours: number;
  /** Capacidad máxima que cubre este tramo. */
  capacityMax: number;
  /** Precio del barco completo, en USD. */
  price: number;
}

export type OnRequestUnit = "per_person" | "per_hour" | "per_booking";

/** Extra bajo solicitud; el precio sólo aparece cuando PEX lo publica. */
export interface OnRequestItem {
  label: Localized;
  price?: number;
  unit?: OnRequestUnit;
}

export interface Operator {
  slug: string;
  name: string;
  whatsapp?: string;
  email?: string;
  /** Comisión de Atlante con este operador. Interna: nunca sale en público. */
  commissionPct?: number;
  /** ISO `YYYY-MM-DD`. Los tres campos siguientes son el checklist del sello. */
  contractSignedAt?: string;
  ampLicense?: string;
  insuranceUntil?: string;
  verified: boolean;
  active: boolean;
}

export interface Vessel {
  slug: string;
  operatorSlug: string;
  name: string;
  /** Clave de tipo: `catamaran`, `ferry`, `no_publicado`. */
  type: string;
  lengthFt?: number;
  capacityMax: number;
  marina: string;

  pricing: PricingRow[];
  /** Claves de ruta que sirve la nave. */
  routes: string[];
  includes: Localized[];
  onRequest: OnRequestItem[];

  /** % de apartado al reservar. */
  depositPct: number;
  cancellationPolicy: Localized;

  photos: string[];
  video?: string;

  closeMode: CloseMode;
  /** Slug de la nave en el checkout de PEX (`/charter/checkout?vessel=`). */
  pexVesselSlug?: string;
  pexPath?: string;
  /** "desde $X/persona" que publica PEX, cuando lo publica. */
  pexPricePerPersonFrom?: number;

  /** Textos escritos en el bloque 2 a partir de los datos publicados por PEX. */
  summary?: Localized;
  description?: Localized;

  /** ISO `YYYY-MM-DD` del día en que se leyó el dato en PEX. */
  verifiedAt: string;
  sourceUrl?: string;
  active: boolean;
  order: number;
}

/** Dominio de PEX sólo como dato de procedencia (ver cabecera del archivo). */
const PEX_SITE = "https://www.pacificexperience.lat";

/** Sin fotos propias todavía: `og-atlante.jpg` es el único activo del repo. */
const PLACEHOLDER = ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"];

const VERIFIED_AT = "2026-09-09";

const MARINA_FLAMENCO = "Marina Flamenco, Amador";

/** Misma política de apartado en las tres naves de PEX. */
const PEX_CANCELLATION: Localized = {
  es: "Reserva con 30 % de abono y el 70 % restante 24 horas antes de navegar. Reembolso completo dentro de las primeras 24 horas tras pagar el abono.",
  en: "Booked with a 30 % deposit and the remaining 70 % 24 hours before sailing. Full refund within the first 24 hours after paying the deposit.",
};

const ON_REQUEST_WATER_TOYS: OnRequestItem = {
  label: {
    es: "Snorkel, kayaks, sillas flotantes y pesca",
    en: "Snorkeling, kayaks, floating chairs and fishing",
  },
};

export const operators: Operator[] = [
  {
    slug: "pex",
    name: "Pacific Experience",
    // El WhatsApp y el correo de PEX no se publican en Atlante (bloque 2, 2.1).
    // Comisión sin fijar: manda `ATLANTE_COMMISSION_PCT` (PENDIENTE MARK).
    verified: false,
    active: true,
  },
];

export const vessels: Vessel[] = [
  {
    slug: "aura",
    operatorSlug: "pex",
    name: "Aura",
    type: "catamaran",
    capacityMax: 35,
    marina: MARINA_FLAMENCO,
    routes: ["bahia", "taboga", "perlas"],
    pricing: [
      { route: "bahia", hours: 4, capacityMax: 15, price: 1300 },
      { route: "taboga", hours: 8, capacityMax: 15, price: 1700 },
      { route: "taboga", hours: 8, capacityMax: 30, price: 2250 },
    ],
    includes: [
      { es: "Combustible", en: "Fuel" },
      { es: "Capitán y marino", en: "Captain and deckhand" },
      { es: "Hielo, coolers, nevera y congelador", en: "Ice, coolers, fridge and freezer" },
      { es: "Agua y sodas", en: "Water and sodas" },
      { es: "BBQ", en: "BBQ" },
      { es: "Piscina de mar", en: "Sea pool" },
      { es: "A/C, camarotes y baños con agua caliente", en: "A/C, cabins and bathrooms with hot water" },
      { es: "Toallas y equipo de sonido", en: "Towels and sound system" },
    ],
    onRequest: [
      ON_REQUEST_WATER_TOYS,
      { label: { es: "BBQ", en: "BBQ" }, price: 20, unit: "per_person" },
      {
        label: { es: "Catering con chef", en: "Catering with a chef" },
        price: 30,
        unit: "per_person",
      },
      { label: { es: "Open bar", en: "Open bar" }, price: 15, unit: "per_person" },
      { label: { es: "Jetski", en: "Jetski" }, price: 100, unit: "per_hour" },
      { label: { es: "Hora extra de navegación", en: "Extra hour of sailing" }, price: 300 },
    ],
    depositPct: 30,
    cancellationPolicy: PEX_CANCELLATION,
    photos: PLACEHOLDER,
    closeMode: "deeplink",
    pexVesselSlug: "aura",
    pexPath: "/charter/aura",
    pexPricePerPersonFrom: 55,
    summary: {
      es: "Catamarán con camarotes, A/C y piscina de mar. Barco completo desde $1,300 y hasta 35 personas.",
      en: "Catamaran with cabins, A/C and a sea pool. Whole boat from $1,300 and up to 35 people.",
    },
    description: {
      es: "Catamarán Aura, con salida desde Marina Flamenco, en Amador. Se renta el barco completo en jornadas de 4, 8 o 12 horas. La capacidad depende de la ruta: hasta 35 personas en la Bahía y el Puente, 30 hacia Taboga y 15 hacia Las Perlas.",
      en: "The Aura catamaran, departing from Marina Flamenco, in Amador. The whole boat is chartered in 4, 8 or 12-hour blocks. Capacity depends on the route: up to 35 people around the Bay and the Bridge, 30 to Taboga and 15 to Las Perlas.",
    },
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/charter/aura`,
    active: true,
    order: 1,
  },
  {
    slug: "pacific-ferry-1",
    operatorSlug: "pex",
    name: "Pacific Ferry 1",
    type: "ferry",
    capacityMax: 30,
    marina: MARINA_FLAMENCO,
    routes: ["bahia", "taboga", "perlas"],
    pricing: [
      { route: "bahia", hours: 4, capacityMax: 15, price: 1300 },
      { route: "bahia", hours: 4, capacityMax: 30, price: 1790 },
      { route: "taboga", hours: 8, capacityMax: 15, price: 1700 },
      { route: "taboga", hours: 8, capacityMax: 30, price: 2250 },
      { route: "perlas", hours: 12, capacityMax: 15, price: 3000 },
      { route: "perlas", hours: 12, capacityMax: 30, price: 3550 },
    ],
    includes: [
      { es: "Capitán y tripulación", en: "Captain and crew" },
      { es: "Combustible", en: "Fuel" },
      { es: "Hielo y coolers", en: "Ice and coolers" },
      { es: "Agua y sodas", en: "Water and sodas" },
      { es: "BBQ", en: "BBQ" },
      { es: "Cubierta techada y salón interior", en: "Covered deck and indoor lounge" },
      { es: "Baños y equipo de sonido", en: "Bathrooms and sound system" },
      { es: "Toallas", en: "Towels" },
    ],
    onRequest: [],
    depositPct: 30,
    cancellationPolicy: PEX_CANCELLATION,
    photos: PLACEHOLDER,
    closeMode: "deeplink",
    pexVesselSlug: "pacific-ferry-1",
    pexPath: "/charter/pacific-ferry-1",
    pexPricePerPersonFrom: 59,
    summary: {
      es: "Hasta 30 personas, cubierta techada y salón interior. Barco completo desde $1,300.",
      en: "Up to 30 people, covered deck and indoor lounge. Whole boat from $1,300.",
    },
    description: {
      es: "El Pacific Ferry 1 en modo chárter privado, con salida desde Marina Flamenco, en Amador. Admite hasta 30 personas en jornadas de 4, 8 o 12 horas: Bahía y Puente por 4 horas, Isla Taboga por 8 horas y Las Perlas por 12.",
      en: "The Pacific Ferry 1 as a private charter, departing from Marina Flamenco, in Amador. It takes up to 30 people in 4, 8 or 12-hour blocks: Bay and Bridge for 4 hours, Taboga Island for 8 and Las Perlas for 12.",
    },
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/charter/pacific-ferry-1`,
    active: true,
    order: 2,
  },
  {
    slug: "sirena-del-mar",
    operatorSlug: "pex",
    name: "Sirena del Mar",
    // PEX no publica el tipo de esta nave: no se rellena a ojo (regla 3).
    type: "no_publicado",
    capacityMax: 80,
    marina: MARINA_FLAMENCO,
    routes: ["bahia", "taboga", "perlas"],
    pricing: [
      { route: "bahia", hours: 4, capacityMax: 15, price: 1300 },
      { route: "bahia", hours: 4, capacityMax: 35, price: 1950 },
      { route: "bahia", hours: 4, capacityMax: 80, price: 3410 },
      { route: "taboga", hours: 8, capacityMax: 15, price: 1700 },
      { route: "taboga", hours: 8, capacityMax: 30, price: 2250 },
      { route: "taboga", hours: 8, capacityMax: 80, price: 4080 },
      { route: "perlas", hours: 12, capacityMax: 15, price: 3000 },
      { route: "perlas", hours: 12, capacityMax: 80, price: 5380 },
    ],
    includes: [
      { es: "Capitán y tripulación", en: "Captain and crew" },
      { es: "Combustible", en: "Fuel" },
      { es: "Hielo y coolers", en: "Ice and coolers" },
      { es: "Agua y sodas", en: "Water and sodas" },
      { es: "BBQ", en: "BBQ" },
      { es: "A/C y cabina cerrada", en: "A/C and enclosed cabin" },
      { es: "Baños y equipo de sonido", en: "Bathrooms and sound system" },
      { es: "Toallas", en: "Towels" },
    ],
    onRequest: [ON_REQUEST_WATER_TOYS],
    depositPct: 30,
    cancellationPolicy: PEX_CANCELLATION,
    photos: PLACEHOLDER,
    closeMode: "deeplink",
    pexVesselSlug: "sirena-del-mar",
    pexPath: "/charter/sirena-del-mar",
    summary: {
      es: "La nave más grande: hasta 80 personas, cabina cerrada con A/C. Barco completo desde $1,300.",
      en: "The largest vessel: up to 80 people, enclosed cabin with A/C. Whole boat from $1,300.",
    },
    description: {
      es: "El Sirena del Mar en modo chárter privado, con salida desde Marina Flamenco, en Amador. Es la nave de mayor capacidad de Pacific Experience: hasta 80 personas, en jornadas de 4, 8 o 12 horas hacia la Bahía y el Puente, Isla Taboga o Las Perlas.",
      en: "The Sirena del Mar as a private charter, departing from Marina Flamenco, in Amador. It is Pacific Experience's largest vessel: up to 80 people, in 4, 8 or 12-hour blocks to the Bay and the Bridge, Taboga Island or Las Perlas.",
    },
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/charter/sirena-del-mar`,
    active: true,
    order: 3,
  },
];

/**
 * Ocasiones del formulario de charter (bloque 4.2). Son claves: las etiquetas
 * ES/EN viven en el diccionario de `src/lib/i18n.ts`.
 */
export const OCCASIONS = [
  "cumpleanos",
  "despedida",
  "corporativo",
  "propuesta",
  "familiar",
  "otro",
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export function getVesselFromCode(slug: string): Vessel | undefined {
  return vessels.find((v) => v.slug === slug);
}

export function getOperatorFromCode(slug: string): Operator | undefined {
  return operators.find((o) => o.slug === slug);
}
