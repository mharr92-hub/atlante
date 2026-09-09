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
  nav_main: { es: "Principal", en: "Main" },
  nav_footer: { es: "Pie de página", en: "Footer" },
  nav_legal: { es: "Legal", en: "Legal" },
  nav_language: { es: "Idioma", en: "Language" },
  hero_media_alt: {
    es: "Embarcación privada en el Pacífico de Panamá",
    en: "Private vessel on the Panamanian Pacific",
  },
  footer_tagline: {
    es: "Experiencias privadas en el océano.",
    en: "Private experiences on the ocean.",
  },
  footer_rights: {
    es: "Todos los derechos reservados.",
    en: "All rights reserved.",
  },
  contact_message_placeholder: {
    es: "Taboga, Las Perlas, atardecer…",
    en: "Taboga, Las Perlas, evening…",
  },
  contact_group_placeholder: {
    es: "8 invitados, celebración",
    en: "8 guests, celebration",
  },
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
  destinos_lede: {
    es: "Tres destinos y todas las formas de llegar a cada uno, con el precio de cada operador.",
    en: "Three destinations and every way to reach each one, with each operator's price.",
  },
  dest_see: { es: "Ver todas las formas de ir", en: "See every way to get there" },
  dest_tickets_title: { es: "En ticket, por persona", en: "By ticket, per person" },
  dest_charters_title: {
    es: "En nave completa, para tu grupo",
    en: "Whole vessel, for your group",
  },
  dest_unavailable_title: { es: "Publicado, sin venta hoy", en: "Listed, not on sale today" },
  dest_unavailable_note: {
    es: "Pacific Experience no lo está vendiendo por ahora, así que no mostramos precio ni botón. En cuanto vuelva, aparece aquí.",
    en: "Pacific Experience is not selling it right now, so we show no price and no button. As soon as it is back, it appears here.",
  },
  dest_empty: {
    es: "Todavía no hay ninguna forma publicada de llegar a este destino.",
    en: "There is no published way to reach this destination yet.",
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
  live_availability_note: {
    es: "Cupos tomados de la disponibilidad de Pacific Experience.",
    en: "Spots taken from Pacific Experience's live availability.",
  },
  slot_spots: { es: "{n} cupos", en: "{n} spots" },
  slot_full: { es: "Sin cupo", en: "Sold out" },
  no_capacity: {
    es: "Esa salida no tiene cupo para {n} personas.",
    en: "That departure does not have room for {n} people.",
  },
  next_dates_capacity: {
    es: "Próximas fechas con cupo:",
    en: "Next dates with room:",
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
  err_slot: {
    es: "Esa salida ya no tiene cupo. Elige otro horario o fecha.",
    en: "That departure no longer has room. Pick another time or date.",
  },

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

  // ------------------------------------------- marketplace de charters ----
  charters_marketplace_lede: {
    es: "Compara naves por capacidad, ruta y precio por persona. El pago se completa con el operador: Atlante nunca cobra.",
    en: "Compare vessels by capacity, route and price per person. Payment is completed with the operator: Atlante never charges you.",
  },
  filters_title: { es: "Filtros", en: "Filters" },
  filter_people: { es: "¿Cuántas personas?", en: "How many people?" },
  filter_min_capacity: { es: "Capacidad mínima", en: "Minimum capacity" },
  filter_max_budget: { es: "Presupuesto máximo por barco", en: "Maximum budget per boat" },
  filter_duration: { es: "Duración", en: "Duration" },
  filter_route: { es: "Ruta", en: "Route" },
  filter_type: { es: "Tipo de nave", en: "Vessel type" },
  filter_marina: { es: "Marina de salida", en: "Departure marina" },
  filter_all: { es: "Todas", en: "All" },
  filter_clear: { es: "Limpiar filtros", en: "Clear filters" },
  hours_n: { es: "{n} h", en: "{n} h" },
  vessels_count: { es: "{n} naves", en: "{n} vessels" },
  charters_empty: {
    es: "Ninguna nave cumple esos filtros. Prueba con menos restricciones.",
    en: "No vessel matches those filters. Try loosening them.",
  },

  route_bahia: { es: "Bahía y Puente", en: "Bay and Bridge" },
  route_taboga: { es: "Isla Taboga", en: "Taboga Island" },
  route_perlas: { es: "Las Perlas", en: "Las Perlas" },

  vessel_type_catamaran: { es: "Catamarán", en: "Catamaran" },
  vessel_type_ferry: { es: "Ferry", en: "Ferry" },
  vessel_type_no_publicado: { es: "Tipo no publicado", en: "Type not published" },

  badge_direct: { es: "Reserva directa", en: "Direct booking" },
  badge_quote: { es: "Cotizar", en: "Request a quote" },
  from_boat_tier: {
    es: "desde {price} ({hours} h · hasta {cap} pax)",
    en: "from {price} ({hours} h · up to {cap} pax)",
  },
  per_person_from: { es: "desde {price} por persona", en: "from {price} per person" },
  per_person_for_group: { es: "para {n} personas", en: "for {n} people" },
  no_price_for_group: {
    es: "Sin tarifa publicada para {n} personas: consúltanos.",
    en: "No published rate for {n} people: ask us.",
  },

  compare_add: { es: "Comparar", en: "Compare" },
  compare_added: { es: "En el comparador", en: "In the comparison" },
  compare_open: { es: "Comparar {n} naves", en: "Compare {n} vessels" },
  compare_title: { es: "Comparador de naves", en: "Vessel comparison" },
  compare_max: { es: "Puedes comparar hasta 4 naves.", en: "You can compare up to 4 vessels." },
  compare_empty: {
    es: "Elige naves en el listado para compararlas.",
    en: "Pick vessels from the listing to compare them.",
  },

  vessel_operator: { es: "Operador", en: "Operator" },
  operator_verified: { es: "Operador verificado", en: "Verified operator" },
  operator_verified_note: {
    es: "Licencia AMP, seguro vigente y contrato firmado, comprobados por Atlante.",
    en: "AMP licence, valid insurance and signed contract, checked by Atlante.",
  },
  marina_label: { es: "Marina de salida", en: "Departure marina" },
  deposit_label: { es: "Apartado", en: "Deposit" },
  deposit_value: { es: "{n} % al reservar", en: "{n} % at booking" },
  cancellation_label: { es: "Cancelación", en: "Cancellation" },
  on_request_title: { es: "Bajo solicitud", en: "On request" },
  on_request_no_price: { es: "Sin precio publicado", en: "No published price" },
  unit_per_hour: { es: "por hora", en: "per hour" },
  unit_per_booking: { es: "por reserva", en: "per booking" },
  price_table_title: { es: "Precios por ruta y jornada", en: "Prices by route and duration" },
  th_route: { es: "Ruta", en: "Route" },
  th_duration: { es: "Duración", en: "Duration" },
  th_capacity: { es: "Capacidad", en: "Capacity" },
  th_boat_price: { es: "Barco completo", en: "Whole boat" },
  up_to_pax: { es: "hasta {n} pax", en: "up to {n} pax" },
  pex_publishes_per_person: {
    es: "Pacific Experience publica «desde {price} por persona» para esta nave.",
    en: "Pacific Experience publishes “from {price} per person” for this vessel.",
  },
  routes_label: { es: "Rutas", en: "Routes" },

  charter_form_title: { es: "Reserva esta nave", en: "Book this vessel" },
  charter_form_lede: {
    es: "Déjanos tus datos y te llevamos al checkout de Pacific Experience con el código de Atlante.",
    en: "Leave your details and we take you to Pacific Experience's checkout with Atlante's code.",
  },
  field_hours: { es: "Jornada", en: "Duration" },
  field_people: { es: "Personas", en: "People" },
  field_charter_date: { es: "Fecha deseada", en: "Preferred date" },
  field_occasion: { es: "Ocasión (opcional)", en: "Occasion (optional)" },
  occasion_cumpleanos: { es: "Cumpleaños", en: "Birthday" },
  occasion_despedida: { es: "Despedida de soltero o soltera", en: "Bachelor or bachelorette party" },
  occasion_corporativo: { es: "Corporativo", en: "Corporate" },
  occasion_propuesta: { es: "Propuesta de matrimonio", en: "Marriage proposal" },
  occasion_familiar: { es: "Paseo familiar", en: "Family outing" },
  occasion_otro: { es: "Otra", en: "Other" },
  estimate_boat: { es: "Barco completo", en: "Whole boat" },
  estimate_note: {
    es: "Precio publicado por Pacific Experience para ese tramo; el total final lo verás en su checkout.",
    en: "Price published by Pacific Experience for that tier; you will see the final total on their checkout.",
  },
  err_hours: { es: "Elige una jornada publicada.", en: "Pick a published duration." },
  err_people: { es: "Revisa la cantidad de personas.", en: "Check the number of people." },
  err_vessel: { es: "Esa nave no está disponible.", en: "That vessel is not available." },
  back_charters: { es: "Volver a las naves", en: "Back to the vessels" },

  quote_cta: { es: "Pedir cotización", en: "Request a quote" },
  quote_title: { es: "Cotizar {name}", en: "Get a quote for {name}" },
  quote_lede: {
    es: "Cuéntanos la fecha, la jornada y el grupo. Atlante negocia con el operador y te pasa la propuesta.",
    en: "Tell us the date, the duration and the group. Atlante talks to the operator and sends you the proposal.",
  },
  // PENDIENTE MARK: sin horario de atención confirmado no se promete un SLA.
  quote_reply: { es: "Te respondemos por WhatsApp.", en: "We reply on WhatsApp." },
  quote_sent_title: { es: "Recibimos tu solicitud", en: "We got your request" },
  quote_sent_body: {
    es: "Abre WhatsApp para que la conversación quede contigo y respondamos ahí mismo.",
    en: "Open WhatsApp so the conversation stays with you and we can reply right there.",
  },
  quote_open_whatsapp: { es: "Abrir WhatsApp", en: "Open WhatsApp" },
  send: { es: "Enviar", en: "Send" },

  // -------------------------------------------------------------- aliados --
  partners_eyebrow: { es: "Aliados", en: "Partners" },
  partners_title: { es: "Trabaja con Atlante.", en: "Work with Atlante." },
  partners_lede: {
    es: "Atlante no opera naves ni cobra al cliente: conecta a quien busca con quien opera. Estas son las tres formas de sumarte.",
    en: "Atlante does not operate vessels and never charges the customer: it connects who is looking with who operates. These are the three ways to join.",
  },
  partners_operators_title: { es: "Operadores de charter", en: "Charter operators" },
  partners_operators_body: {
    es: "Publicamos tu ficha en el marketplace y te mandamos leads calificados con fecha, jornada y grupo. Tú cobras al cliente y operas; Atlante cobra comisión según acuerdo.",
    en: "We publish your listing on the marketplace and send you qualified leads with date, duration and group size. You charge the customer and operate; Atlante earns a commission as agreed.",
  },
  partners_hotels_title: { es: "Hoteles y concierges", en: "Hotels and concierges" },
  partners_hotels_body: {
    es: "Te damos un código de aliado que viaja en cada reserva que recomiendes. No operas nada y la comisión se liquida por reporte mensual.",
    en: "We give you a partner code that travels with every booking you recommend. You operate nothing and the commission is settled with a monthly report.",
  },
  partners_agencies_title: { es: "Agencias y DMC", en: "Agencies and DMCs" },
  partners_agencies_body: {
    es: "Tarifa neta y disponibilidad para armar tus paquetes, con el mismo precio que publica el operador.",
    en: "Net rates and availability to build your packages, at the same price the operator publishes.",
  },
  partners_commission_note: {
    es: "Comisión según acuerdo: se fija por operador antes de publicar la ficha.",
    en: "Commission as agreed: it is set per operator before the listing goes live.",
  },
  partners_cta: { es: "Registrarme", en: "Sign up" },
  partner_form_title: { es: "Solicitud de aliado", en: "Partner application" },
  partner_kind: { es: "¿Quién eres?", en: "Who are you?" },
  partner_kind_operator: { es: "Operador de charter", en: "Charter operator" },
  partner_kind_hotel: { es: "Hotel o concierge", en: "Hotel or concierge" },
  partner_kind_agency: { es: "Agencia o DMC", en: "Agency or DMC" },
  field_business: { es: "Nombre o razón social", en: "Name or business name" },
  field_vessel_name: { es: "Nombre de la embarcación (opcional)", en: "Vessel name (optional)" },
  field_capacity: { es: "Capacidad (opcional)", en: "Capacity (optional)" },
  field_zone: { es: "Zona de operación (opcional)", en: "Operating area (optional)" },
  field_photos: {
    es: "Enlaces de fotos, uno por línea (opcional)",
    en: "Photo links, one per line (optional)",
  },
  field_message: { es: "Cuéntanos (opcional)", en: "Tell us more (optional)" },
  partner_submit: { es: "Enviar solicitud", en: "Send application" },
  partner_sent: {
    es: "Recibimos tu solicitud. Te escribimos por WhatsApp para revisarla.",
    en: "We got your application. We will message you on WhatsApp to review it.",
  },
  partner_sent_offline: {
    es: "No pudimos guardar la solicitud. Escríbenos por WhatsApp y la registramos a mano.",
    en: "We could not save the application. Message us on WhatsApp and we will register it by hand.",
  },
  err_partner_name: { es: "Escribe el nombre.", en: "Enter the name." },
  err_generic: { es: "Revisa los datos e inténtalo de nuevo.", en: "Check the details and try again." },
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

/** Traduce una clave dinámica del marketplace; sin entrada devuelve la clave. */
function dynamicLabel(prefix: string, value: string, locale: Locale): string {
  const key = `${prefix}${value}` as DictKey;
  return key in dict ? t(key, locale) : value;
}

/** `bahia` → "Bahía y Puente". */
export function routeLabel(route: string, locale: Locale): string {
  return dynamicLabel("route_", route, locale);
}

/** `catamaran` → "Catamarán". */
export function vesselTypeLabel(type: string, locale: Locale): string {
  return dynamicLabel("vessel_type_", type, locale);
}

/** `cumpleanos` → "Cumpleaños". */
export function occasionLabel(occasion: string, locale: Locale): string {
  return dynamicLabel("occasion_", occasion, locale);
}

/** Unidad de un extra bajo solicitud; sin unidad publicada, cadena vacía. */
export function onRequestUnitLabel(unit: string | undefined, locale: Locale): string {
  if (unit === "per_person") return t("per_person", locale);
  if (unit === "per_hour") return t("unit_per_hour", locale);
  if (unit === "per_booking") return t("unit_per_booking", locale);
  return "";
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
