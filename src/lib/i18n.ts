/**
 * Lightweight bilingual (ES/EN) layer.
 *
 * Content strings live in the tour catalog as { es, en } objects; UI chrome
 * strings live in the `dict` below. `useLocale()` exposes the active locale and
 * a setter that persists to a cookie + localStorage so both the client and the
 * server (via the `locale` cookie) agree.
 */
import type { Locale, Localized } from "@/content/tours";

export type { Locale, Localized };

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";

/** Resolve a { es, en } value for the active locale. */
export function L(value: Localized, locale: Locale): string {
  return value[locale] ?? value[DEFAULT_LOCALE];
}

/** UI chrome dictionary — keys reused across components. */
export const dict = {
  nav_reserve: { es: "Ver charters", en: "View charters" },
  hero_eyebrow: {
    es: "Charters privados - Ciudad de Panama",
    en: "Private charters - Panama City",
  },
  hero_title: {
    es: "El Pacifico panameno, a tu ritmo.",
    en: "The Panamanian Pacific, at your pace.",
  },
  hero_lede: {
    es: "Alquila el barco completo. Solicitas fecha y horas, pagas el 30% de abono y te confirmamos por WhatsApp en un máximo de 24 horas.",
    en: "Charter the whole boat. Request a date and hours, pay a 30% deposit, and we confirm on WhatsApp within 24 hours.",
  },
  hero_cta_tours: { es: "Ver charters", en: "View charters" },
  hero_cta_whatsapp: { es: "Hablar por WhatsApp", en: "Chat on WhatsApp" },
  hero_product_charters: { es: "Charters", en: "Charters" },
  hero_product_ferry: { es: "Ferry", en: "Ferry" },
  hero_product_tours: { es: "Tours", en: "Tours" },
  coming_soon: { es: "Próximamente", en: "Coming soon" },
  trust_reviews: { es: "resenas", en: "reviews" },
  trust_experiences: { es: "experiencias", en: "experiences" },
  trust_response: { es: "respuesta promedio", en: "avg response" },
  tours_eyebrow: { es: "Tours y experiencias", en: "Tours & experiences" },
  tours_title: { es: "Atardecer, isla, archipielago.", en: "Sunset, island, archipelago." },
  tours_lede: {
    es: "Estas experiencias son el punto de partida para escoger el dia correcto. Te orientamos y canalizamos la reserva con el operador correspondiente.",
    en: "These experiences are the starting point for choosing the right day. We guide you and channel the booking to the right operator.",
  },
  filter_all: { es: "Todos", en: "All" },
  filter_sunset: { es: "Atardecer", en: "Sunset" },
  filter_islands: { es: "Islas", en: "Islands" },
  filter_celebration: { es: "Celebraciones", en: "Celebrations" },
  filter_custom: { es: "A medida", en: "Custom" },
  request_tour: { es: "Solicitar tour", en: "Request tour" },
  view_detail: { es: "Ver detalle", en: "View details" },
  compare: { es: "Comparar tours", en: "Compare tours" },
  quote_charter: { es: "Cotizar charter", en: "Quote charter" },
  charters_eyebrow: { es: "Charters privados", en: "Private charters" },
  charters_title: { es: "Renta total de yate.", en: "Whole-yacht rental." },
  charters_lede: {
    es: "Pacific Ferry y Sirena del Mar están listos para solicitar. El resto de la flota se publica cuando tengamos specs confirmados — sin precios inventados.",
    en: "Pacific Ferry and Sirena del Mar are ready to request. The rest of the fleet publishes when we have confirmed specs — no invented prices.",
  },
  charters_view_all: { es: "Ver toda la flota", en: "See the full fleet" },
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
    es: "Atlante del Pacifico ayuda a grupos a reservar el barco correcto en el Pacifico panameno. Hoy el camino vivo es charter privado: solicitud corta, abono del 30% y confirmacion por WhatsApp en 24 horas.",
    en: "Atlante del Pacifico helps groups book the right boat on the Panamanian Pacific. The live path today is private charter: a short request, 30% deposit and WhatsApp confirmation within 24 hours.",
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
  itinerary: { es: "Itinerario", en: "Itinerary" },
  route_map: { es: "Ruta", en: "Route" },
  weather: { es: "Clima", en: "Weather" },
  from: { es: "desde", en: "from" },
  per_person: { es: "por persona", en: "per person" },
  per_boat: { es: "por yate", en: "per boat" },
  guests: { es: "Invitados", en: "Guests" },
  total: { es: "Total", en: "Total" },
  deposit: { es: "Deposito para reservar", en: "Deposit to reserve" },
  spots_left: { es: "Pocos cupos esta semana", en: "Few spots left this week" },
  booked_today: { es: "personas reservaron hoy", en: "people booked today" },
  badge_family: { es: "Familiar", en: "Family-friendly" },
  badge_adventure: { es: "Aventura", en: "Adventure" },
  badge_romantic: { es: "Romantico", en: "Romantic" },
  badge_fishing: { es: "Pesca", en: "Fishing" },
  badge_celebration: { es: "Celebracion", en: "Celebration" },
  badge_snorkel: { es: "Snorkel", en: "Snorkel" },
  back_home: { es: "Volver al inicio", en: "Back to home" },
  popup_title: { es: "10% en tu primera reserva", en: "10% off your first booking" },
  popup_body: {
    es: "Dejanos tu email y te enviamos un codigo de descuento para tu primer tour o charter.",
    en: "Leave your email and we'll send a discount code for your first tour or charter.",
  },
  popup_cta: { es: "Quiero mi descuento", en: "Get my discount" },
  popup_placeholder: { es: "tu@email.com", en: "you@email.com" },
  popup_thanks: {
    es: "Gracias! Revisa tu correo para el codigo.",
    en: "Thanks! Check your inbox for the code.",
  },
} as const;

export type DictKey = keyof typeof dict;

/** Translate a chrome key. */
export function t(key: DictKey, locale: Locale): string {
  return L(dict[key], locale);
}
