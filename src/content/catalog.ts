/**
 * Catálogo real de Pacific Experience (PEX) — la única fuente de verdad del
 * sitio público hasta que el bloque 3 lo mueva a base de datos.
 *
 * Regla 3 del bloque: aquí no se inventa nada. Cada producto lleva `verifiedAt`
 * y `sourceUrl` con la página de PEX donde se leyó el dato (recorrido en vivo
 * del 09/09/2026). Lo que PEX no publica no existe: no se rellena "a ojo".
 *
 * `sourceUrl` es un DATO, no un enlace: cualquier `href` que se renderice pasa
 * por `buildPexUrl()` (`src/lib/pex.ts`). Este archivo y `src/lib/pex.ts` son
 * los dos únicos donde `scripts/check-pex-links.mjs` tolera el dominio de PEX.
 */

export type Locale = "es" | "en";
export type Localized = Record<Locale, string>;

export type ProductKind = "tour" | "party" | "ferry" | "charter_pex";
export type PriceUnit = "per_person" | "per_segment" | "per_boat";

export type Badge =
  | "family"
  | "adventure"
  | "romantic"
  | "celebration"
  | "snorkel"
  | "group"
  | "evening";

/**
 * Una fila de la tabla de precios: categoría de pasajero (adulto nacional,
 * turista, niño y jubilado) o tramo de capacidad de un chárter.
 * `key` identifica la fila en la URL del funnel y en el JSON `pax` del lead.
 */
export interface PriceRow {
  key: string;
  label: Localized;
  price: number;
  note?: Localized;
}

/** `weekdays` en formato JS: 0 = domingo … 6 = sábado. */
export interface Schedule {
  weekdays: number[];
  times: { start: string; end?: string }[];
  /** Primera fecha con salida publicada, ISO `YYYY-MM-DD`. */
  validFrom?: string;
  note?: Localized;
}

export interface ProductAddon {
  slug: string;
  name: Localized;
  price: number;
  /** `pending` = PEX no publica si el precio es por persona o por reserva. */
  unit: "per_person" | "per_booking" | "pending";
  durationMin?: number;
  active: boolean;
}

export type PexCheckout =
  | { kind: "tour"; tripId: string | null }
  | { kind: "charter"; vessel: string };

export interface Product {
  slug: string;
  kind: ProductKind;
  source: "pex";

  name: Localized;
  summary: Localized;
  description: Localized;

  priceFrom: number;
  priceUnit: PriceUnit;
  priceTable?: PriceRow[];
  /** "desde $X por persona" en chárters, sólo cuando PEX lo publica. */
  pricePerPersonFrom?: number;

  durationMin?: number;
  durationLabel: Localized;

  schedule?: Schedule;
  capacityMin?: number;
  capacityMax?: number;

  includes: Localized[];
  notIncluded?: Localized[];
  policies: Localized[];
  addons?: ProductAddon[];

  images: string[];

  pexPath: string;
  pexCheckout?: PexCheckout;

  available: boolean;
  /** ISO `YYYY-MM-DD` del día en que se leyó el dato en PEX. */
  verifiedAt: string;
  sourceUrl: string;
  order: number;
  badges?: Badge[];
}

/** Dominio de PEX sólo como dato de procedencia (ver cabecera del archivo). */
const PEX_SITE = "https://www.pacificexperience.lat";

/** Todavía no hay fotos propias: `og-atlante.jpg` es el único activo del repo. */
const PLACEHOLDER = ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"];

const VERIFIED_AT = "2026-09-09";

export const catalog: Product[] = [
  {
    slug: "tour-bahia",
    kind: "tour",
    source: "pex",
    name: { es: "Tour por la Bahía", en: "Bay Tour" },
    summary: {
      es: "Hora y media por la Bahía de Panamá a bordo del Pacific Ferry 1, con salidas al atardecer y de noche.",
      en: "Ninety minutes around the Bay of Panama aboard the Pacific Ferry 1, with evening and night departures.",
    },
    description: {
      es: "Recorrido de 1 h 30 min por la Bahía de Panamá a bordo del Pacific Ferry 1. Zarpa de Isla Perico, en Amador, con dos salidas por día: 5:30–7:00 PM y 8:00–9:30 PM, viernes, sábado y domingo a partir del 18 de septiembre de 2026. El precio incluye el fee de puerto y el parqueo es gratis. El abordaje se hace con el código QR que Pacific Experience envía por correo al completar la compra.",
      en: "A 1 h 30 min cruise around the Bay of Panama aboard the Pacific Ferry 1. It departs from Isla Perico, in Amador, with two sailings a day: 5:30–7:00 PM and 8:00–9:30 PM, Friday to Sunday from 18 September 2026. The price includes the port fee and parking is free. Boarding is done with the QR code Pacific Experience emails you once the purchase is complete.",
    },
    priceFrom: 25,
    priceUnit: "per_person",
    priceTable: [
      {
        key: "persona",
        label: { es: "Por persona", en: "Per person" },
        price: 25,
        note: { es: "Fee de puerto incluido.", en: "Port fee included." },
      },
    ],
    durationMin: 90,
    durationLabel: { es: "1 h 30 min", en: "1 h 30 min" },
    schedule: {
      weekdays: [5, 6, 0],
      times: [
        { start: "17:30", end: "19:00" },
        { start: "20:00", end: "21:30" },
      ],
      validFrom: "2026-09-18",
      note: {
        es: "Viernes, sábado y domingo desde el 18 de septiembre de 2026.",
        en: "Friday, Saturday and Sunday from 18 September 2026.",
      },
    },
    includes: [
      { es: "Fee de puerto", en: "Port fee" },
      { es: "Parqueo gratis", en: "Free parking" },
      { es: "Abordaje con código QR enviado por correo", en: "Boarding with a QR code sent by email" },
    ],
    policies: [
      { es: "Pago en línea del 100 % al reservar.", en: "100 % paid online at booking time." },
      { es: "Reembolso sólo hasta 24 horas antes de la salida.", en: "Refunds only up to 24 hours before departure." },
      { es: "Zarpa de Isla Perico, Amador.", en: "Departs from Isla Perico, Amador." },
    ],
    images: PLACEHOLDER,
    pexPath: "/ferry/bahia",
    pexCheckout: { kind: "tour", tripId: null },
    available: true,
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/ferry/bahia`,
    order: 1,
    badges: ["evening", "family"],
  },
  {
    slug: "party-bahia",
    kind: "party",
    source: "pex",
    name: { es: "Party en la Bahía", en: "Bay Party" },
    summary: {
      es: "Dos horas y media de fiesta a bordo del Sirena del Mar, viernes y sábado de 7:00 a 9:30 PM.",
      en: "Two and a half hours of party aboard the Sirena del Mar, Friday and Saturday from 7:00 to 9:30 PM.",
    },
    description: {
      es: "Fiesta de 2 h 30 min en la Bahía de Panamá a bordo del Sirena del Mar, viernes y sábado de 7:00 a 9:30 PM. Está pensada para grupos de 30 a 80 personas e incluye DJ y bebida de bienvenida; el resto de las bebidas se compran en la barra a bordo.",
      en: "A 2 h 30 min party on the Bay of Panama aboard the Sirena del Mar, Friday and Saturday from 7:00 to 9:30 PM. It is built for groups of 30 to 80 people and includes a DJ and a welcome drink; any other drinks are bought at the bar on board.",
    },
    priceFrom: 35,
    priceUnit: "per_person",
    priceTable: [
      {
        key: "persona",
        label: { es: "Por persona", en: "Per person" },
        price: 35,
        note: { es: "Precio desde, publicado por Pacific Experience.", en: "Starting price published by Pacific Experience." },
      },
    ],
    durationMin: 150,
    durationLabel: { es: "2 h 30 min", en: "2 h 30 min" },
    schedule: {
      weekdays: [5, 6],
      times: [{ start: "19:00", end: "21:30" }],
      note: {
        es: "Viernes y sábado, de 7:00 a 9:30 PM.",
        en: "Friday and Saturday, 7:00 to 9:30 PM.",
      },
    },
    capacityMin: 30,
    capacityMax: 80,
    includes: [
      { es: "DJ a bordo", en: "DJ on board" },
      { es: "Bebida de bienvenida", en: "Welcome drink" },
    ],
    notIncluded: [
      { es: "Bebidas de la barra (barra de pago)", en: "Bar drinks (cash bar)" },
    ],
    policies: [
      { es: "Pago en línea del 100 % al reservar.", en: "100 % paid online at booking time." },
      { es: "Reembolso sólo hasta 24 horas antes de la salida.", en: "Refunds only up to 24 hours before departure." },
      { es: "Grupos de 30 a 80 personas.", en: "Groups of 30 to 80 people." },
    ],
    images: PLACEHOLDER,
    pexPath: "/tours/c0d1a003-0000-4000-8000-000000000085",
    pexCheckout: { kind: "tour", tripId: "c0d1a003-0000-4000-8000-000000000085" },
    available: true,
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/tours/c0d1a003-0000-4000-8000-000000000085`,
    order: 2,
    badges: ["celebration", "group", "evening"],
  },
  {
    slug: "ferry-taboga",
    kind: "ferry",
    source: "pex",
    name: { es: "Ferry a Isla Taboga", en: "Ferry to Taboga Island" },
    summary: {
      es: "Boleto abierto a Taboga: seis salidas diarias desde Isla Perico y unos 30 minutos de travesía.",
      en: "Open ticket to Taboga: six daily departures from Isla Perico and about a 30-minute crossing.",
    },
    description: {
      es: "Boleto abierto de ferry entre Isla Perico (Amador) e Isla Taboga. Hay seis salidas diarias desde Isla Perico, entre las 5:45 AM y las 3:35 PM, y seis regresos entre las 6:35 AM y las 4:30 PM. La travesía dura unos 30 minutos. El boleto no lleva hora fija: vale 180 días y se puede usar en cualquier salida. La tarifa cambia según el pasajero, y el peaje de entrada a Taboga de $1 se paga aparte, en efectivo.",
      en: "Open ferry ticket between Isla Perico (Amador) and Taboga Island. There are six daily departures from Isla Perico, between 5:45 AM and 3:35 PM, and six return trips between 6:35 AM and 4:30 PM. The crossing takes about 30 minutes. The ticket has no fixed time: it is valid for 180 days and can be used on any departure. The fare depends on the passenger, and Taboga's $1 entrance toll is paid separately, in cash.",
    },
    priceFrom: 10,
    priceUnit: "per_segment",
    priceTable: [
      { key: "adulto-nacional", label: { es: "Adulto nacional", en: "National adult" }, price: 10 },
      {
        key: "turista-semana",
        label: { es: "Turista (entre semana)", en: "Tourist (weekday)" },
        price: 12,
      },
      {
        key: "turista-finde",
        label: { es: "Turista (fin de semana)", en: "Tourist (weekend)" },
        price: 15,
      },
      { key: "nino-jubilado", label: { es: "Niño y jubilado", en: "Child and senior" }, price: 8 },
    ],
    durationMin: 30,
    durationLabel: { es: "~30 min de travesía", en: "~30 min crossing" },
    schedule: {
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      times: [],
      note: {
        es: "Seis salidas diarias desde Isla Perico entre 5:45 AM y 3:35 PM; seis regresos entre 6:35 AM y 4:30 PM. El boleto es abierto: no se elige hora al comprar.",
        en: "Six daily departures from Isla Perico between 5:45 AM and 3:35 PM; six return trips between 6:35 AM and 4:30 PM. The ticket is open: you do not pick a time when buying.",
      },
    },
    includes: [{ es: "Un tramo de travesía", en: "One-way crossing" }],
    notIncluded: [
      {
        es: "Peaje de entrada a Taboga: $1 en efectivo",
        en: "Taboga entrance toll: $1 in cash",
      },
    ],
    policies: [
      {
        es: "El boleto es válido 180 días y sirve para cualquier salida.",
        en: "The ticket is valid for 180 days and works on any departure.",
      },
      { es: "El precio es por tramo.", en: "The price is per one-way segment." },
    ],
    images: PLACEHOLDER,
    pexPath: "/ferry/taboga",
    available: false,
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/ferry/taboga`,
    order: 3,
    badges: ["family"],
  },
  {
    slug: "ferry-contadora",
    kind: "ferry",
    source: "pex",
    name: { es: "Ferry a Contadora", en: "Ferry to Contadora" },
    summary: {
      es: "Travesía al archipiélago de Las Perlas. Pacific Experience la muestra como no disponible por el momento.",
      en: "Crossing to the Las Perlas archipelago. Pacific Experience shows it as unavailable for now.",
    },
    description: {
      es: "Ferry entre la Ciudad de Panamá y la isla Contadora, en el archipiélago de Las Perlas. Pacific Experience lo publica con una tarifa registrada de $130 y la marca como no disponible por el momento. Ofrece además un adicional de tour por las islas del archipiélago de 4 horas por $50, cuya unidad de cobro no está publicada.",
      en: "Ferry between Panama City and Contadora island, in the Las Perlas archipelago. Pacific Experience lists a registered fare of $130 and marks it as unavailable for now. It also offers a 4-hour archipelago islands tour add-on for $50, whose billing unit is not published.",
    },
    priceFrom: 130,
    priceUnit: "per_person",
    priceTable: [
      {
        key: "tarifa-registrada",
        label: { es: "Tarifa registrada", en: "Registered fare" },
        price: 130,
        note: {
          es: "Pacific Experience no publica si es por persona o por tramo.",
          en: "Pacific Experience does not publish whether it is per person or per segment.",
        },
      },
    ],
    durationLabel: { es: "No publicada", en: "Not published" },
    includes: [],
    policies: [
      {
        es: "Pacific Experience lo muestra como no disponible por el momento.",
        en: "Pacific Experience shows it as unavailable for now.",
      },
    ],
    addons: [
      {
        slug: "tour-islas",
        name: {
          es: "Tour por las islas del archipiélago",
          en: "Archipelago islands tour",
        },
        price: 50,
        unit: "pending",
        durationMin: 240,
        active: false,
      },
    ],
    images: PLACEHOLDER,
    pexPath: "/ferry/contadora",
    available: false,
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/ferry/contadora`,
    order: 4,
    badges: ["adventure"],
  },
  {
    slug: "charter-aura",
    kind: "charter_pex",
    source: "pex",
    name: { es: "Chárter Aura", en: "Aura Charter" },
    summary: {
      es: "Catamarán con camarotes, A/C y piscina de mar. Barco completo desde $1,300 y hasta 35 personas.",
      en: "Catamaran with cabins, A/C and a sea pool. Whole boat from $1,300 and up to 35 people.",
    },
    description: {
      es: "Catamarán Aura, con salida desde Marina Flamenco, en Amador. Se renta el barco completo en jornadas de 4, 8 o 12 horas. La capacidad depende de la ruta: hasta 35 personas en la Bahía y el Puente, 30 hacia Taboga y 15 hacia Las Perlas. Se reserva con el 30 % de abono y el 70 % restante 24 horas antes de navegar, con reembolso completo dentro de las primeras 24 horas después de pagar el abono.",
      en: "The Aura catamaran, departing from Marina Flamenco, in Amador. The whole boat is chartered in 4, 8 or 12-hour blocks. Capacity depends on the route: up to 35 people around the Bay and the Bridge, 30 to Taboga and 15 to Las Perlas. It is booked with a 30 % deposit and the remaining 70 % 24 hours before sailing, with a full refund within the first 24 hours after paying the deposit.",
    },
    priceFrom: 1300,
    priceUnit: "per_boat",
    pricePerPersonFrom: 55,
    priceTable: [
      {
        key: "barco-completo",
        label: { es: "Barco completo — desde", en: "Whole boat — from" },
        price: 1300,
      },
      {
        key: "taboga-8h-15",
        label: { es: "Isla Taboga · 8 h · hasta 15 pax", en: "Taboga Island · 8 h · up to 15 pax" },
        price: 1700,
      },
      {
        key: "taboga-8h-30",
        label: { es: "Isla Taboga · 8 h · hasta 30 pax", en: "Taboga Island · 8 h · up to 30 pax" },
        price: 2250,
      },
    ],
    durationLabel: { es: "4 h / 8 h / 12 h", en: "4 h / 8 h / 12 h" },
    capacityMax: 35,
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
    notIncluded: [
      {
        es: "Bajo solicitud, sin precio publicado: snorkel, kayaks, sillas flotantes y pesca",
        en: "On request, no published price: snorkeling, kayaks, floating chairs and fishing",
      },
    ],
    policies: [
      {
        es: "Reserva con 30 % de abono y 70 % restante 24 horas antes de navegar.",
        en: "Booked with a 30 % deposit and the remaining 70 % 24 hours before sailing.",
      },
      {
        es: "Reembolso completo dentro de las primeras 24 horas tras pagar el abono.",
        en: "Full refund within the first 24 hours after paying the deposit.",
      },
      {
        es: "Capacidad por ruta: 35 en la Bahía y el Puente, 30 hacia Taboga, 15 hacia Las Perlas.",
        en: "Capacity by route: 35 around the Bay and the Bridge, 30 to Taboga, 15 to Las Perlas.",
      },
      { es: "Sale de Marina Flamenco, Amador.", en: "Departs from Marina Flamenco, Amador." },
    ],
    addons: [
      {
        slug: "bbq",
        name: { es: "BBQ", en: "BBQ" },
        price: 20,
        unit: "per_person",
        active: true,
      },
      {
        slug: "catering-chef",
        name: { es: "Catering con chef", en: "Catering with a chef" },
        price: 30,
        unit: "per_person",
        active: true,
      },
      {
        slug: "open-bar",
        name: { es: "Open bar", en: "Open bar" },
        price: 15,
        unit: "per_person",
        active: true,
      },
      {
        slug: "jetski",
        name: { es: "Jetski por hora", en: "Jetski per hour" },
        price: 100,
        unit: "pending",
        active: true,
      },
      {
        slug: "hora-extra",
        name: { es: "Hora extra de navegación", en: "Extra hour of sailing" },
        price: 300,
        unit: "per_booking",
        durationMin: 60,
        active: true,
      },
    ],
    images: PLACEHOLDER,
    pexPath: "/charter/aura",
    pexCheckout: { kind: "charter", vessel: "aura" },
    available: true,
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/charter/aura`,
    order: 5,
    badges: ["celebration", "group", "snorkel"],
  },
  {
    slug: "charter-pacific-ferry-1",
    kind: "charter_pex",
    source: "pex",
    name: { es: "Chárter Pacific Ferry 1", en: "Pacific Ferry 1 Charter" },
    summary: {
      es: "Hasta 30 personas, cubierta techada y salón interior. Barco completo desde $1,300.",
      en: "Up to 30 people, covered deck and indoor lounge. Whole boat from $1,300.",
    },
    description: {
      es: "El Pacific Ferry 1 en modo chárter privado, con salida desde Marina Flamenco, en Amador. Admite hasta 30 personas en jornadas de 4, 8 o 12 horas: Bahía y Puente por 4 horas, Isla Taboga por 8 horas y Las Perlas por 12. Se reserva con el 30 % de abono y el 70 % restante 24 horas antes de navegar.",
      en: "The Pacific Ferry 1 as a private charter, departing from Marina Flamenco, in Amador. It takes up to 30 people in 4, 8 or 12-hour blocks: Bay and Bridge for 4 hours, Taboga Island for 8 and Las Perlas for 12. It is booked with a 30 % deposit and the remaining 70 % 24 hours before sailing.",
    },
    priceFrom: 1300,
    priceUnit: "per_boat",
    pricePerPersonFrom: 59,
    priceTable: [
      {
        key: "bahia-4h-15",
        label: { es: "Bahía y Puente · 4 h · hasta 15 pax", en: "Bay and Bridge · 4 h · up to 15 pax" },
        price: 1300,
      },
      {
        key: "bahia-4h-30",
        label: { es: "Bahía y Puente · 4 h · hasta 30 pax", en: "Bay and Bridge · 4 h · up to 30 pax" },
        price: 1790,
      },
      {
        key: "taboga-8h-15",
        label: { es: "Isla Taboga · 8 h · hasta 15 pax", en: "Taboga Island · 8 h · up to 15 pax" },
        price: 1700,
      },
      {
        key: "taboga-8h-30",
        label: { es: "Isla Taboga · 8 h · hasta 30 pax", en: "Taboga Island · 8 h · up to 30 pax" },
        price: 2250,
      },
      {
        key: "perlas-12h-15",
        label: { es: "Las Perlas · 12 h · hasta 15 pax", en: "Las Perlas · 12 h · up to 15 pax" },
        price: 3000,
      },
      {
        key: "perlas-12h-30",
        label: { es: "Las Perlas · 12 h · hasta 30 pax", en: "Las Perlas · 12 h · up to 30 pax" },
        price: 3550,
      },
    ],
    durationLabel: { es: "4 h / 8 h / 12 h", en: "4 h / 8 h / 12 h" },
    capacityMax: 30,
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
    policies: [
      {
        es: "Reserva con 30 % de abono y 70 % restante 24 horas antes de navegar.",
        en: "Booked with a 30 % deposit and the remaining 70 % 24 hours before sailing.",
      },
      {
        es: "Reembolso completo dentro de las primeras 24 horas tras pagar el abono.",
        en: "Full refund within the first 24 hours after paying the deposit.",
      },
      { es: "Sale de Marina Flamenco, Amador.", en: "Departs from Marina Flamenco, Amador." },
    ],
    images: PLACEHOLDER,
    pexPath: "/charter/pacific-ferry-1",
    pexCheckout: { kind: "charter", vessel: "pacific-ferry-1" },
    available: true,
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/charter/pacific-ferry-1`,
    order: 6,
    badges: ["group", "family"],
  },
  {
    slug: "charter-sirena-del-mar",
    kind: "charter_pex",
    source: "pex",
    name: { es: "Chárter Sirena del Mar", en: "Sirena del Mar Charter" },
    summary: {
      es: "La nave más grande: hasta 80 personas, cabina cerrada con A/C. Barco completo desde $1,300.",
      en: "The largest vessel: up to 80 people, enclosed cabin with A/C. Whole boat from $1,300.",
    },
    description: {
      es: "El Sirena del Mar en modo chárter privado, con salida desde Marina Flamenco, en Amador. Es la nave de mayor capacidad de Pacific Experience: hasta 80 personas, en jornadas de 4, 8 o 12 horas hacia la Bahía y el Puente, Isla Taboga o Las Perlas. Se reserva con el 30 % de abono y el 70 % restante 24 horas antes de navegar.",
      en: "The Sirena del Mar as a private charter, departing from Marina Flamenco, in Amador. It is Pacific Experience's largest vessel: up to 80 people, in 4, 8 or 12-hour blocks to the Bay and the Bridge, Taboga Island or Las Perlas. It is booked with a 30 % deposit and the remaining 70 % 24 hours before sailing.",
    },
    priceFrom: 1300,
    priceUnit: "per_boat",
    priceTable: [
      {
        key: "bahia-4h-15",
        label: { es: "Bahía y Puente · 4 h · hasta 15 pax", en: "Bay and Bridge · 4 h · up to 15 pax" },
        price: 1300,
      },
      {
        key: "bahia-4h-35",
        label: { es: "Bahía y Puente · 4 h · hasta 35 pax", en: "Bay and Bridge · 4 h · up to 35 pax" },
        price: 1950,
      },
      {
        key: "bahia-4h-80",
        label: { es: "Bahía y Puente · 4 h · hasta 80 pax", en: "Bay and Bridge · 4 h · up to 80 pax" },
        price: 3410,
      },
      {
        key: "taboga-8h-15",
        label: { es: "Isla Taboga · 8 h · hasta 15 pax", en: "Taboga Island · 8 h · up to 15 pax" },
        price: 1700,
      },
      {
        key: "taboga-8h-30",
        label: { es: "Isla Taboga · 8 h · hasta 30 pax", en: "Taboga Island · 8 h · up to 30 pax" },
        price: 2250,
      },
      {
        key: "taboga-8h-80",
        label: { es: "Isla Taboga · 8 h · hasta 80 pax", en: "Taboga Island · 8 h · up to 80 pax" },
        price: 4080,
      },
      {
        key: "perlas-12h-15",
        label: { es: "Las Perlas · 12 h · hasta 15 pax", en: "Las Perlas · 12 h · up to 15 pax" },
        price: 3000,
      },
      {
        key: "perlas-12h-80",
        label: { es: "Las Perlas · 12 h · hasta 80 pax", en: "Las Perlas · 12 h · up to 80 pax" },
        price: 5380,
      },
    ],
    durationLabel: { es: "4 h / 8 h / 12 h", en: "4 h / 8 h / 12 h" },
    capacityMax: 80,
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
    notIncluded: [
      {
        es: "Opcional, sin precio publicado: snorkel, kayaks, sillas flotantes y pesca",
        en: "Optional, no published price: snorkeling, kayaks, floating chairs and fishing",
      },
    ],
    policies: [
      {
        es: "Reserva con 30 % de abono y 70 % restante 24 horas antes de navegar.",
        en: "Booked with a 30 % deposit and the remaining 70 % 24 hours before sailing.",
      },
      {
        es: "Reembolso completo dentro de las primeras 24 horas tras pagar el abono.",
        en: "Full refund within the first 24 hours after paying the deposit.",
      },
      { es: "Sale de Marina Flamenco, Amador.", en: "Departs from Marina Flamenco, Amador." },
    ],
    images: PLACEHOLDER,
    pexPath: "/charter/sirena-del-mar",
    pexCheckout: { kind: "charter", vessel: "sirena-del-mar" },
    available: true,
    verifiedAt: VERIFIED_AT,
    sourceUrl: `${PEX_SITE}/charter/sirena-del-mar`,
    order: 7,
    badges: ["celebration", "group"],
  },
];

export function getProduct(slug: string): Product | undefined {
  return catalog.find((p) => p.slug === slug);
}

/** Ticketería: lo que se reserva por el funnel de 3 clics. */
export const ticketProducts = catalog.filter((p) =>
  ["tour", "party", "ferry"].includes(p.kind),
);

/** Naves de Pacific Experience: en el bloque 2 sólo enlazan a su checkout. */
export const pexVessels = catalog.filter((p) => p.kind === "charter_pex");
