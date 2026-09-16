/**
 * Atlante charter fleet — source of truth for /charters, fichas and checkout.
 *
 * Pricing: this repo does not contain an authoritative tariff sheet. Sample
 * totals are tagged TODO_MARK so Mark can replace them before marketing them
 * as official. Never treat TODO_MARK numbers as confirmed operator rates.
 *
 * Aura is intentionally absent from this catalog.
 */

import type { Localized } from "@/lib/i18n";

export const DEPOSIT_PERCENT = 30;

export const DEPOSIT_DISCLAIMER_ES =
  "Tu abono confirma tu solicitud, no la reserva. Verificamos la disponibilidad con el operador de la nave en un máximo de 24 horas y te confirmamos por WhatsApp. Si la fecha no está disponible, te ofrecemos una fecha o nave alternativa; si ninguna te sirve, te devolvemos el 100% del abono.";

export const DEPOSIT_DISCLAIMER_EN =
  "Your deposit confirms the request, not the reservation. We check availability with the vessel operator within 24 hours and confirm on WhatsApp. If the date is not available, we offer an alternative date or boat; if none work for you, we refund 100% of the deposit.";

export type CharterStatus = "live" | "coming_soon";

export interface CharterDuration {
  id: "4h" | "8h" | "12h";
  hours: number;
  label: Localized;
  /**
   * Sample whole-boat USD total used to compute a 30% deposit.
   * `null` = do not create a PagueloFácil charge until Mark fills this in.
   */
  sampleTotalUsd: number | null;
  /** Always true until Mark replaces TODO_MARK values. */
  pricesAreSample: true;
}

export interface Charter {
  slug: string;
  status: CharterStatus;
  name: Localized;
  tagline: Localized;
  summary: Localized;
  description: Localized;
  maxPax: number | null;
  departure: Localized;
  durations: CharterDuration[];
  includes: Localized[];
  specs: Array<{ label: Localized; value: Localized }>;
  gallery: string[];
  heroImage: string;
  cardCrop: "card-sunset" | "card-taboga" | "card-perlas";
  /**
   * TODO_MARK cited range for display only (not a duration table).
   * Shown as "desde" / range copy — not as official per-hour tariffs.
   */
  citedRangeUsd?: { from: number; to: number };
}

const DURATION_4H: Omit<CharterDuration, "sampleTotalUsd"> = {
  id: "4h",
  hours: 4,
  label: { es: "4 horas", en: "4 hours" },
  pricesAreSample: true,
};
const DURATION_8H: Omit<CharterDuration, "sampleTotalUsd"> = {
  id: "8h",
  hours: 8,
  label: { es: "8 horas", en: "8 hours" },
  pricesAreSample: true,
};
const DURATION_12H: Omit<CharterDuration, "sampleTotalUsd"> = {
  id: "12h",
  hours: 12,
  label: { es: "12 horas", en: "12 hours" },
  pricesAreSample: true,
};

const CONSERVATIVE_INCLUDES: Localized[] = [
  { es: "Embarcacion completa para tu grupo", en: "Whole vessel for your group" },
  { es: "Capitan y tripulacion", en: "Captain and crew" },
  { es: "Combustible", en: "Fuel" },
  { es: "Chalecos salvavidas", en: "Life jackets" },
];

const DEPARTURE: Localized = {
  es: "Marina Flamenco, Amador, Ciudad de Panama",
  en: "Marina Flamenco, Amador, Panama City",
};

function placeholder(name: string, slug: string): Charter {
  return {
    slug,
    status: "coming_soon",
    name: { es: name, en: name },
    tagline: { es: "Proximo a publicarse", en: "Coming soon" },
    summary: {
      es: "Ficha y tarifas cuando tengamos specs confirmados. Sin precios inventados.",
      en: "Listing and rates once specs are confirmed. No invented prices.",
    },
    description: {
      es: "Esta nave forma parte de la flota Atlante y se publicara cuando tengamos datos confirmados.",
      en: "This vessel is part of the Atlante fleet and will be listed once we have confirmed data.",
    },
    maxPax: null,
    departure: DEPARTURE,
    durations: [],
    includes: [],
    specs: [],
    gallery: ["/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-taboga",
  };
}

export const charters: Charter[] = [
  {
    slug: "pacific-ferry",
    status: "live",
    name: { es: "Pacific Ferry", en: "Pacific Ferry" },
    tagline: {
      es: "Chárter privado para grupos medianos.",
      en: "Private charter for mid-size groups.",
    },
    summary: {
      es: "El barco completo para tu grupo. Bahía, Taboga o Las Perlas — la ruta se acuerda con el capitán.",
      en: "The whole boat for your group. Bay, Taboga or Las Perlas — the route is agreed with the captain.",
    },
    description: {
      es: "Pacific Ferry se alquila completo. Capacidad de referencia: hasta ~30 personas. Duraciones de 4, 8 o 12 horas. Punto de salida: Marina Flamenco, Amador. El inventario exacto lo confirma el operador de la nave al validar tu fecha.",
      en: "Pacific Ferry is chartered whole. Reference capacity: up to ~30 guests. Durations of 4, 8 or 12 hours. Departure: Marina Flamenco, Amador. The operator confirms exact inventory when validating your date.",
    },
    maxPax: 30,
    departure: DEPARTURE,
    citedRangeUsd: { from: 1300, to: 1790 },
    durations: [
      // TODO_MARK: $1,300 is the cited "desde" — not a confirmed 4h tariff.
      { ...DURATION_4H, sampleTotalUsd: 1300 },
      { ...DURATION_8H, sampleTotalUsd: null },
      { ...DURATION_12H, sampleTotalUsd: null },
    ],
    includes: CONSERVATIVE_INCLUDES,
    specs: [
      { label: { es: "Capacidad", en: "Capacity" }, value: { es: "Hasta ~30 personas", en: "Up to ~30 guests" } },
      { label: { es: "Duraciones", en: "Durations" }, value: { es: "4h · 8h · 12h", en: "4h · 8h · 12h" } },
      { label: { es: "Salida", en: "Departure" }, value: DEPARTURE },
      {
        label: { es: "Tipo", en: "Type" },
        value: { es: "Chárter privado — barco completo", en: "Private charter — whole boat" },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-sunset",
  },
  {
    slug: "sirena-del-mar",
    status: "live",
    name: { es: "Sirena del Mar", en: "Sirena del Mar" },
    tagline: {
      es: "Chárter privado para grupos grandes.",
      en: "Private charter for large groups.",
    },
    summary: {
      es: "El barco completo para celebraciones y empresas. Bahía, Taboga o Las Perlas — la ruta se acuerda con el capitán.",
      en: "The whole boat for celebrations and companies. Bay, Taboga or Las Perlas — the route is agreed with the captain.",
    },
    description: {
      es: "Sirena del Mar se alquila completo. Capacidad de referencia: hasta ~80 personas. Duraciones de 4, 8 o 12 horas. Punto de salida: Marina Flamenco, Amador. El inventario exacto lo confirma el operador de la nave al validar tu fecha.",
      en: "Sirena del Mar is chartered whole. Reference capacity: up to ~80 guests. Durations of 4, 8 or 12 hours. Departure: Marina Flamenco, Amador. The operator confirms exact inventory when validating your date.",
    },
    maxPax: 80,
    departure: DEPARTURE,
    citedRangeUsd: { from: 1300, to: 5380 },
    durations: [
      // TODO_MARK: $1,300 is the cited "desde" — not a confirmed 4h tariff.
      { ...DURATION_4H, sampleTotalUsd: 1300 },
      { ...DURATION_8H, sampleTotalUsd: null },
      { ...DURATION_12H, sampleTotalUsd: null },
    ],
    includes: CONSERVATIVE_INCLUDES,
    specs: [
      { label: { es: "Capacidad", en: "Capacity" }, value: { es: "Hasta ~80 personas", en: "Up to ~80 guests" } },
      { label: { es: "Duraciones", en: "Durations" }, value: { es: "4h · 8h · 12h", en: "4h · 8h · 12h" } },
      { label: { es: "Salida", en: "Departure" }, value: DEPARTURE },
      {
        label: { es: "Tipo", en: "Type" },
        value: { es: "Chárter privado — barco completo", en: "Private charter — whole boat" },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-perlas",
  },
  // Names only — no invented specs or prices. Aura is excluded.
  placeholder("Happy Ending", "happy-ending"),
  placeholder("Sun Cat", "sun-cat"),
  placeholder("Hatteras", "hatteras"),
  placeholder("Rapport", "rapport"),
  placeholder("King Fish", "king-fish"),
  placeholder("Happiness", "happiness"),
  placeholder("Yate Carver 54 Periboat", "yate-carver-54-periboat"),
  placeholder("Diamond of the Sea", "diamond-of-the-sea"),
  placeholder("Endeavour", "endeavour"),
  placeholder("ANA C", "ana-c"),
];

export const liveCharters = charters.filter((c) => c.status === "live");
export const upcomingCharters = charters.filter((c) => c.status === "coming_soon");

export function getCharter(slug: string): Charter | undefined {
  return charters.find((c) => c.slug === slug);
}

export function getLiveCharter(slug: string): Charter | undefined {
  const c = getCharter(slug);
  return c?.status === "live" ? c : undefined;
}

export function getDuration(charter: Charter, durationId: string): CharterDuration | undefined {
  return charter.durations.find((d) => d.id === durationId);
}

export function depositFromSample(sampleTotalUsd: number, percent = DEPOSIT_PERCENT): number {
  return Math.round((sampleTotalUsd * percent) / 100);
}
