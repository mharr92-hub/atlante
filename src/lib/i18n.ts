/**
 * Lightweight bilingual (ES/EN) layer.
 *
 * Content strings live in the catalog as { es, en } objects; UI chrome strings
 * live in the `dict` below. `useLocale()` exposes the active locale and a setter
 * that persists to a cookie + localStorage so both the client and the server
 * (via the `locale` cookie) agree.
 */
import type { Locale, Localized } from "@/content/catalog";

export type { Locale, Localized };

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";

/** Resolve a { es, en } value for the active locale. */
export function L(value: Localized, locale: Locale): string {
  return value[locale] ?? value[DEFAULT_LOCALE];
}

/** UI chrome dictionary — keys reused across components. */
export const dict = {
  nav_reserve: { es: "Reservar", en: "Book now" },
  hero_eyebrow: {
    es: "Tours y charters privados - Ciudad de Panama",
    en: "Private tours & charters - Panama City",
  },
  hero_title: {
    es: "El Pacifico panameno, bien conectado.",
    en: "The Panamanian Pacific, well connected.",
  },
  hero_lede: {
    es: "Comparamos ferry, tours y charters de operadores verificados y te llevamos al pago directo con el operador.",
    en: "We compare ferries, tours and charters from verified operators and take you straight to paying the operator.",
  },
  hero_cta_tours: { es: "Tickets y tours", en: "Tickets & tours" },
  hero_cta_charters: { es: "Charters", en: "Charters" },

  tours_eyebrow: { es: "Tickets y tours", en: "Tickets & tours" },
  tours_title: { es: "Bahía, party e isla.", en: "Bay, party and island." },
  tours_lede: {
    es: "El catálogo de Pacific Experience con su precio real. Eliges aquí y el pago se completa en su checkout.",
    en: "Pacific Experience's catalog with its real price. You choose here and payment is completed on their checkout.",
  },
  charters_eyebrow: { es: "Charters privados", en: "Private charters" },
  charters_title: { es: "Renta total de la nave.", en: "Whole-vessel rental." },
  charters_lede: {
    es: "Naves de Pacific Experience para grupos: barco completo, capitán y tripulación, con salida desde Marina Flamenco.",
    en: "Pacific Experience vessels for groups: whole boat, captain and crew, departing from Marina Flamenco.",
  },

  view_detail: { es: "Ver detalle", en: "View details" },
  view_all_tours: { es: "Ver todos los tickets", en: "See all tickets" },
  view_all_charters: { es: "Ver todas las naves", en: "See all vessels" },
  reserve: { es: "Reservar", en: "Book" },
  reserve_from: { es: "Reservar — desde", en: "Book — from" },
  book_on_pex: { es: "Reservar en Pacific Experience", en: "Book on Pacific Experience" },
  view_on_pex: { es: "Ver ficha en Pacific Experience", en: "View listing on Pacific Experience" },
  direct_booking_pex: {
    es: "Reserva directa en Pacific Experience",
    en: "Direct booking on Pacific Experience",
  },
  consult_whatsapp: { es: "Consultar por WhatsApp", en: "Ask on WhatsApp" },

  destinos_eyebrow: { es: "Destinos", en: "Destinations" },
  destinos_title: {
    es: "Rutas ocultas desde el Pacifico panameno.",
    en: "Hidden routes from the Panamanian Pacific.",
  },
  about_eyebrow: { es: "Sobre Atlante", en: "About Atlante" },
  about_title: {
    es: "Concierge maritimo, con criterio comercial.",
    en: "Maritime concierge, with commercial judgment.",
  },
  about_body: {
    es: "Atlante del Pacifico fue creado para ayudar a viajeros y grupos a escoger mejor antes de reservar. Trabajamos como puente comercial: entendemos el plan, recomendamos rutas y conectamos con tours o charters que encajan con el presupuesto, la fecha y el nivel de privacidad esperado.",
    en: "Atlante del Pacifico was created to help travelers and groups choose better before booking. We work as a commercial bridge: we understand the plan, recommend routes and connect you with tours or charters that fit the budget, date and privacy level you expect.",
  },
  faq_eyebrow: { es: "Preguntas frecuentes", en: "Frequently asked" },
  faq_title: { es: "Practicas antes de zarpar.", en: "Practical, before you set sail." },
  contact_eyebrow: { es: "Concierge", en: "Concierge" },
  contact_title: { es: "Cuentanos que quieres hacer.", en: "Tell us what you want to do." },
  contact_body: {
    es: "Envia fecha, cantidad de invitados y si buscas tour, destino especifico o charter completo. Te respondemos con la ruta mas conveniente.",
    en: "Send the date, number of guests and whether you want a tour, a specific destination or a full charter. We reply with the most convenient route.",
  },
  form_name: { es: "Nombre", en: "Name" },
  form_phone: { es: "Telefono", en: "Phone" },
  form_email: { es: "Email", en: "Email" },
  form_date: { es: "Fecha preferida", en: "Preferred date" },
  form_group: { es: "Grupo", en: "Group" },
  form_message: { es: "Que buscas?", en: "What are you looking for?" },
  form_submit: { es: "Enviar por WhatsApp", en: "Send via WhatsApp" },

  included: { es: "Incluye", en: "What's included" },
  excluded: { es: "No incluye", en: "Not included" },
  policies: { es: "Políticas del operador", en: "Operator policies" },
  prices: { es: "Precios", en: "Prices" },
  schedule: { es: "Horario", en: "Schedule" },
  departure_days: { es: "Días de salida", en: "Departure days" },
  duration: { es: "Duración", en: "Duration" },
  capacity: { es: "Capacidad", en: "Capacity" },
  gallery: { es: "Galería", en: "Gallery" },
  weather: { es: "Clima", en: "Weather" },
  verified_on: { es: "Datos verificados el", en: "Data verified on" },

  from: { es: "desde", en: "from" },
  per_person: { es: "por persona", en: "per person" },
  per_segment: { es: "por tramo", en: "per segment" },
  per_boat: { es: "barco completo", en: "whole boat" },
  on_request: { es: "consultar", en: "on request" },
  up_to_people: { es: "Hasta {n} personas", en: "Up to {n} people" },
  guests: { es: "Invitados", en: "Guests" },
  total: { es: "Total", en: "Total" },

  kind_tour: { es: "Tour", en: "Tour" },
  kind_party: { es: "Party", en: "Party" },
  kind_ferry: { es: "Ferry", en: "Ferry" },
  kind_charter_pex: { es: "Chárter", en: "Charter" },

  badge_family: { es: "Familiar", en: "Family-friendly" },
  badge_adventure: { es: "Aventura", en: "Adventure" },
  badge_romantic: { es: "Romantico", en: "Romantic" },
  badge_celebration: { es: "Celebracion", en: "Celebration" },
  badge_snorkel: { es: "Snorkel", en: "Snorkel" },
  badge_group: { es: "Grupos", en: "Groups" },
  badge_evening: { es: "Atardecer", en: "Evening" },

  back_home: { es: "Volver al inicio", en: "Back to home" },
  back_catalog: { es: "Volver al catálogo", en: "Back to the catalog" },
  draft_notice: {
    es: "BORRADOR — pendiente de revisión por Mark",
    en: "DRAFT — pending review by Mark",
  },
  legal_terms: { es: "Términos", en: "Terms" },
  legal_privacy: { es: "Privacidad", en: "Privacy" },
  legal_cancellations: { es: "Cancelaciones", en: "Cancellations" },
  legal_how: { es: "Cómo funciona", en: "How it works" },

  // ------------------------------------------------------------- funnel ----
  step_of: { es: "Paso {n} de 3", en: "Step {n} of 3" },
  step1_name: { es: "Experiencia", en: "Experience" },
  step2_name: { es: "Fecha y pasajeros", en: "Date and passengers" },
  step3_name: { es: "Tus datos", en: "Your details" },
  step_back: { es: "Atrás", en: "Back" },
  choose_date_cta: { es: "Elegir fecha", en: "Choose a date" },
  continue_cta: { es: "Continuar", en: "Continue" },
  secure_payment_pex: {
    es: "Pago seguro en Pacific Experience",
    en: "Secure payment on Pacific Experience",
  },
  choose_date: { es: "Elige la fecha", en: "Pick a date" },
  estimated_date: { es: "Fecha estimada de viaje", en: "Estimated travel date" },
  open_ticket_note: {
    es: "El boleto es abierto: no se elige hora al comprar.",
    en: "The ticket is open: you do not pick a time when buying.",
  },
  choose_time: { es: "Elige el horario", en: "Pick a time" },
  label_date: { es: "Fecha", en: "Date" },
  label_time: { es: "Horario", en: "Time" },
  passengers: { es: "Pasajeros", en: "Passengers" },
  addons_title: { es: "Adicionales", en: "Add-ons" },
  addon_unit_pending: {
    es: "Unidad de cobro por confirmar: no suma al estimado.",
    en: "Billing unit to be confirmed: it is not added to the estimate.",
  },
  availability_note: {
    es: "La disponibilidad final se confirma en Pacific Experience.",
    en: "Final availability is confirmed on Pacific Experience.",
  },
  min_group: { es: "Grupo mínimo de {n} personas", en: "Minimum group of {n} people" },
  max_group: { es: "Máximo {n} personas", en: "Maximum {n} people" },
  summary: { es: "Resumen", en: "Summary" },
  estimated_total: { es: "Total estimado", en: "Estimated total" },
  charged_by_pex: {
    es: "El cobro lo realiza Pacific Experience; el total final lo verás en su checkout.",
    en: "Pacific Experience takes the payment; you will see the final total on their checkout.",
  },
  field_name: { es: "Nombre y apellido", en: "First and last name" },
  field_whatsapp: { es: "WhatsApp", en: "WhatsApp" },
  field_email: { es: "Correo electrónico", en: "Email" },
  field_partner: { es: "Código de aliado (opcional)", en: "Partner code (optional)" },
  accept_before: {
    es: "Acepto las políticas de Pacific Experience y que Atlante transfiera mis datos a Pacific Experience para completar la reserva. He leído los ",
    en: "I accept Pacific Experience's policies and that Atlante transfers my data to Pacific Experience to complete the booking. I have read the ",
  },
  accept_and: { es: " y la ", en: " and the " },
  continue_to_pex: {
    es: "Continuar al pago en Pacific Experience",
    en: "Continue to payment on Pacific Experience",
  },
  sending: { es: "Enviando…", en: "Sending…" },
  err_name: { es: "Escribe tu nombre y tu apellido.", en: "Enter your first and last name." },
  err_email: { es: "Escribe un correo válido.", en: "Enter a valid email." },
  err_phone: { es: "Escribe un número de WhatsApp válido.", en: "Enter a valid WhatsApp number." },
  err_accept: { es: "Necesitamos tu autorización para continuar.", en: "We need your authorization to continue." },
  err_date: { es: "Elige una fecha con salida disponible.", en: "Pick a date with an available departure." },
  err_pax: { es: "Revisa la cantidad de pasajeros.", en: "Check the number of passengers." },

  // -------------------------------------------------------------- listo ----
  listo_title: {
    es: "Te llevamos a Pacific Experience para completar tu pago",
    en: "We are taking you to Pacific Experience to complete your payment",
  },
  listo_countdown: { es: "Abrimos su página en {n}…", en: "Opening their page in {n}…" },
  listo_go_now: { es: "Ir ahora", en: "Go now" },
  listo_code_line: {
    es: "Tu código de referido es ATLANTE — si el checkout te lo pide, pégalo.",
    en: "Your referral code is ATLANTE — if the checkout asks for it, paste it.",
  },
  listo_copy: { es: "Copiar", en: "Copy" },
  listo_copied: { es: "Copiado", en: "Copied" },
} as const;

export type DictKey = keyof typeof dict;

/** Translate a chrome key. */
export function t(key: DictKey, locale: Locale): string {
  return L(dict[key], locale);
}

/** Translate a chrome key interpolating `{name}` placeholders. */
export function tf(key: DictKey, locale: Locale, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (out, [name, value]) => out.replaceAll(`{${name}}`, String(value)),
    t(key, locale),
  );
}

/** Month names for the funnel calendar (index 0 = January). */
export const MONTHS: Record<Locale, string[]> = {
  es: [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

/** Weekday initials, Sunday first (matches `Date#getDay`). */
export const WEEKDAYS_SHORT: Record<Locale, string[]> = {
  es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** Weekday names for "días de salida". */
export const WEEKDAYS_LONG: Record<Locale, string[]> = {
  es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

/** "vie · sáb · dom". Vacío cuando el producto sale todos los días. */
export function weekdaysLabel(weekdays: number[] | undefined, locale: Locale): string {
  if (!weekdays || weekdays.length === 0 || weekdays.length === 7) return "";
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS_SHORT[locale][d])
    .join(" · ");
}

/** "18 de septiembre de 2026" / "18 September 2026". */
export function formatDate(iso: string, locale: Locale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const day = Number(m[3]);
  const month = MONTHS[locale][Number(m[2]) - 1];
  return locale === "es" ? `${day} de ${month} de ${m[1]}` : `${day} ${month} ${m[1]}`;
}
