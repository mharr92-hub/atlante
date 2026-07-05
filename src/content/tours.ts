/**
 * Tour & charter catalog for Atlante del Pacifico.
 *
 * This is the single source of truth the marketing pages, tour detail pages,
 * compare view, pricing engine and (later) the booking backend read from.
 * Prices are in USD, the operating currency in Panama.
 *
 * Pricing model mirrors the prod app's approach:
 *  - `priceFrom` is the advertised "desde" price.
 *  - Tours priced `perPerson` multiply by guest count; charters are `perBoat`
 *    (whole-vessel) with a base capacity and an extra-guest surcharge.
 *  - `depositPercent` drives the "reserve now, pay later" deposit.
 */

export type Locale = "es" | "en";

export type Badge =
  | "family"
  | "adventure"
  | "romantic"
  | "fishing"
  | "celebration"
  | "snorkel";

export type PricingModel = "perPerson" | "perBoat";

export type Localized = Record<Locale, string>;

export interface ItineraryStop {
  time: Localized;
  title: Localized;
  detail: Localized;
  /** Optional map coordinate for the interactive route map. */
  coord?: { lat: number; lng: number };
}

export interface Faq {
  q: Localized;
  a: Localized;
}

export interface Tour {
  slug: string;
  kind: "tour" | "charter";
  /** Filter categories used by the homepage grid. */
  categories: Array<"sunset" | "islands" | "celebration" | "custom">;
  name: Localized;
  tagline: Localized;
  summary: Localized;
  description: Localized;
  /** e.g. "3 horas" / "3 hours" */
  duration: Localized;
  badges: Badge[];
  pricing: {
    model: PricingModel;
    priceFrom: number;
    /** Guests included in `priceFrom` for perBoat charters. */
    baseCapacity: number;
    maxCapacity: number;
    /** Surcharge per guest beyond baseCapacity (perBoat only). */
    extraGuestPrice?: number;
    depositPercent: number;
  };
  included: Localized[];
  excluded: Localized[];
  itinerary: ItineraryStop[];
  faqs: Faq[];
  /** Gallery image paths (public/). og-atlante.jpg is the only shipped photo;
   *  swap these for real trip photography when available. */
  gallery: string[];
  heroImage: string;
  /** CSS background-position class for the homepage card crop. */
  cardCrop: "card-sunset" | "card-taboga" | "card-perlas";
}

export const tours: Tour[] = [
  {
    slug: "travesia-al-atardecer",
    kind: "tour",
    categories: ["sunset", "celebration"],
    name: { es: "Travesia al atardecer", en: "Sunset Voyage" },
    tagline: {
      es: "Skyline, cocteles y la mejor luz del dia.",
      en: "Skyline, cocktails and the best light of the day.",
    },
    summary: {
      es: "Un tour corto y cinematografico bordeando el skyline mientras el sol cae tras el canal.",
      en: "A short, cinematic cruise along the skyline as the sun drops behind the canal.",
    },
    description: {
      es: "Tres horas costeando la Bahia de Panama y el Puente de las Americas con la ciudad iluminandose al regreso. Cocteles, musica y fotografia a bordo. Ideal para parejas, cumpleanos y planes after office.",
      en: "Three hours cruising the Bay of Panama and the Bridge of the Americas with the city lighting up on the way back. Cocktails, music and photography on board. Ideal for couples, birthdays and after-office plans.",
    },
    duration: { es: "3 horas", en: "3 hours" },
    badges: ["romantic", "celebration"],
    pricing: {
      model: "perPerson",
      priceFrom: 850,
      baseCapacity: 1,
      maxCapacity: 12,
      depositPercent: 30,
    },
    included: [
      { es: "Capitan y tripulacion certificada", en: "Certified captain and crew" },
      { es: "Cocteles de bienvenida y agua", en: "Welcome cocktails and water" },
      { es: "Musica y equipo de sonido", en: "Music and sound system" },
      { es: "Chalecos salvavidas y seguro", en: "Life jackets and insurance" },
    ],
    excluded: [
      { es: "Transporte al muelle", en: "Transport to the dock" },
      { es: "Propinas para la tripulacion", en: "Crew gratuities" },
    ],
    itinerary: [
      {
        time: { es: "16:30", en: "4:30 PM" },
        title: { es: "Salida desde Amador", en: "Departure from Amador" },
        detail: {
          es: "Abordaje en Marina Flamenco y brindis de bienvenida.",
          en: "Boarding at Marina Flamenco and a welcome toast.",
        },
        coord: { lat: 8.9096, lng: -79.5253 },
      },
      {
        time: { es: "17:15", en: "5:15 PM" },
        title: { es: "Skyline y Puente de las Americas", en: "Skyline and Bridge of the Americas" },
        detail: {
          es: "Costeamos la bahia con vistas de la ciudad y el canal.",
          en: "We cruise the bay with views of the city and the canal.",
        },
        coord: { lat: 8.9436, lng: -79.5644 },
      },
      {
        time: { es: "18:30", en: "6:30 PM" },
        title: { es: "Atardecer y regreso", en: "Sunset and return" },
        detail: {
          es: "El sol cae tras el canal y volvemos con la ciudad iluminada.",
          en: "The sun sets behind the canal and we return to the lit-up city.",
        },
        coord: { lat: 8.9096, lng: -79.5253 },
      },
    ],
    faqs: [
      {
        q: { es: "Que debo llevar?", en: "What should I bring?" },
        a: {
          es: "Ropa comoda, un abrigo ligero para la brisa y tu camara. Nosotros ponemos el resto.",
          en: "Comfortable clothes, a light jacket for the breeze and your camera. We handle the rest.",
        },
      },
      {
        q: { es: "Que pasa si llueve?", en: "What if it rains?" },
        a: {
          es: "Si el clima no es seguro reprogramamos sin costo o cambiamos a un anclaje protegido.",
          en: "If the weather is unsafe we reschedule at no cost or move to a protected anchorage.",
        },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-sunset",
  },
  {
    slug: "escape-a-taboga",
    kind: "tour",
    categories: ["islands", "celebration"],
    name: { es: "Escape a Taboga", en: "Taboga Escape" },
    tagline: {
      es: "La isla de las flores, en medio dia.",
      en: "The island of flowers, in half a day.",
    },
    summary: {
      es: "Cruzas a la isla de las flores, te banas en bahias tranquilas, almuerzas a bordo y vuelves antes de la brisa de la tarde.",
      en: "Cross to the island of flowers, swim in calm bays, lunch on board and return before the afternoon breeze.",
    },
    description: {
      es: "A 12 millas nauticas de Amador, Taboga ofrece anclajes tranquilos y aguas claras. Medio dia de bano, almuerzo a bordo y tiempo para explorar el pueblo de las flores.",
      en: "Twelve nautical miles from Amador, Taboga offers calm anchorages and clear water. Half a day of swimming, lunch on board and time to explore the village of flowers.",
    },
    duration: { es: "Medio dia", en: "Half day" },
    badges: ["family", "snorkel", "celebration"],
    pricing: {
      model: "perPerson",
      priceFrom: 1450,
      baseCapacity: 1,
      maxCapacity: 12,
      depositPercent: 30,
    },
    included: [
      { es: "Capitan y tripulacion certificada", en: "Certified captain and crew" },
      { es: "Almuerzo ligero a bordo", en: "Light lunch on board" },
      { es: "Equipo de snorkel", en: "Snorkel gear" },
      { es: "Bebidas y agua", en: "Drinks and water" },
    ],
    excluded: [
      { es: "Entrada a playas privadas", en: "Private beach entrance fees" },
      { es: "Propinas para la tripulacion", en: "Crew gratuities" },
    ],
    itinerary: [
      {
        time: { es: "09:00", en: "9:00 AM" },
        title: { es: "Salida desde Amador", en: "Departure from Amador" },
        detail: { es: "Abordaje y travesia a Taboga.", en: "Boarding and crossing to Taboga." },
        coord: { lat: 8.9096, lng: -79.5253 },
      },
      {
        time: { es: "10:00", en: "10:00 AM" },
        title: { es: "Anclaje y bano", en: "Anchor and swim" },
        detail: {
          es: "Anclamos frente a la isla para banarnos y hacer snorkel.",
          en: "We anchor off the island to swim and snorkel.",
        },
        coord: { lat: 8.7997, lng: -79.5589 },
      },
      {
        time: { es: "13:00", en: "1:00 PM" },
        title: { es: "Regreso", en: "Return" },
        detail: {
          es: "Almuerzo a bordo y regreso antes de la brisa de la tarde.",
          en: "Lunch on board and return before the afternoon breeze.",
        },
        coord: { lat: 8.9096, lng: -79.5253 },
      },
    ],
    faqs: [
      {
        q: { es: "Es apto para ninos?", en: "Is it kid-friendly?" },
        a: {
          es: "Si. Las aguas de Taboga suelen ser tranquilas y contamos con chalecos para todas las tallas.",
          en: "Yes. Taboga's waters are usually calm and we carry life jackets in all sizes.",
        },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-taboga",
  },
  {
    slug: "expedicion-a-las-perlas",
    kind: "tour",
    categories: ["islands", "custom"],
    name: { es: "Expedicion a Las Perlas", en: "Las Perlas Expedition" },
    tagline: {
      es: "Un dia lento entre islas y calas blancas.",
      en: "A slow day among islands and white coves.",
    },
    summary: {
      es: "Un dia lento entre Contadora, Saboga, Mogo Mogo, calas blancas y snorkel tranquilo. Ideal para celebraciones memorables.",
      en: "A slow day among Contadora, Saboga, Mogo Mogo, white coves and easy snorkeling. Ideal for memorable celebrations.",
    },
    description: {
      es: "El archipielago de Las Perlas es el gran dia fuera de la ciudad: aguas turquesa, snorkel, playas desiertas y almuerzo a bordo. Un plan completo para grupos que quieren desconectar.",
      en: "The Las Perlas archipelago is the big day out of the city: turquoise water, snorkeling, empty beaches and lunch on board. A full plan for groups who want to disconnect.",
    },
    duration: { es: "Dia completo", en: "Full day" },
    badges: ["adventure", "snorkel", "celebration"],
    pricing: {
      model: "perPerson",
      priceFrom: 2800,
      baseCapacity: 1,
      maxCapacity: 12,
      depositPercent: 30,
    },
    included: [
      { es: "Capitan y tripulacion certificada", en: "Certified captain and crew" },
      { es: "Almuerzo completo a bordo", en: "Full lunch on board" },
      { es: "Equipo de snorkel", en: "Snorkel gear" },
      { es: "Bebidas, agua y hielo", en: "Drinks, water and ice" },
    ],
    excluded: [
      { es: "Impuesto de Contadora", en: "Contadora landing fee" },
      { es: "Propinas para la tripulacion", en: "Crew gratuities" },
    ],
    itinerary: [
      {
        time: { es: "07:30", en: "7:30 AM" },
        title: { es: "Salida temprana", en: "Early departure" },
        detail: { es: "Travesia hacia el archipielago.", en: "Crossing toward the archipelago." },
        coord: { lat: 8.9096, lng: -79.5253 },
      },
      {
        time: { es: "10:00", en: "10:00 AM" },
        title: { es: "Contadora y Mogo Mogo", en: "Contadora and Mogo Mogo" },
        detail: {
          es: "Snorkel y bano en calas protegidas.",
          en: "Snorkeling and swimming in protected coves.",
        },
        coord: { lat: 8.6283, lng: -79.033 },
      },
      {
        time: { es: "16:00", en: "4:00 PM" },
        title: { es: "Regreso", en: "Return" },
        detail: { es: "Regreso a Amador al atardecer.", en: "Return to Amador at sunset." },
        coord: { lat: 8.9096, lng: -79.5253 },
      },
    ],
    faqs: [
      {
        q: { es: "Cuanto dura la travesia?", en: "How long is the crossing?" },
        a: {
          es: "Aproximadamente 2 horas por trayecto segun el clima y el punto de anclaje.",
          en: "About 2 hours each way depending on weather and the anchoring point.",
        },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-perlas",
  },
  {
    slug: "charter-atardecer-privado",
    kind: "charter",
    categories: ["sunset", "celebration", "custom"],
    name: { es: "Charter atardecer privado", en: "Private Sunset Charter" },
    tagline: {
      es: "El yate completo, solo para tu grupo.",
      en: "The whole yacht, just for your group.",
    },
    summary: {
      es: "Ideal para cumpleanos, propuestas, after office o un plan corto con la ciudad iluminandose al regreso.",
      en: "Ideal for birthdays, proposals, after-office or a short plan with the city lighting up on the way back.",
    },
    description: {
      es: "Renta total de la embarcacion en la Bahia de Panama por 3 a 4 horas. Ruta privada, capitan, horario flexible y una propuesta armada alrededor del dia que buscas.",
      en: "Whole-vessel rental in the Bay of Panama for 3 to 4 hours. Private route, captain, flexible schedule and a proposal built around the day you want.",
    },
    duration: { es: "3 a 4 horas", en: "3 to 4 hours" },
    badges: ["romantic", "celebration"],
    pricing: {
      model: "perBoat",
      priceFrom: 1200,
      baseCapacity: 8,
      maxCapacity: 12,
      extraGuestPrice: 60,
      depositPercent: 30,
    },
    included: [
      { es: "Yate completo para tu grupo", en: "Whole yacht for your group" },
      { es: "Capitan y tripulacion", en: "Captain and crew" },
      { es: "Ruta y horario a medida", en: "Custom route and schedule" },
      { es: "Equipo de sonido", en: "Sound system" },
    ],
    excluded: [
      { es: "Catering y bebidas premium", en: "Catering and premium drinks" },
      { es: "Decoracion tematica", en: "Themed decoration" },
    ],
    itinerary: [
      {
        time: { es: "Flexible", en: "Flexible" },
        title: { es: "Horario a tu medida", en: "Schedule on your terms" },
        detail: {
          es: "Definimos salida, ruta y duracion contigo antes de zarpar.",
          en: "We define departure, route and duration with you before setting sail.",
        },
        coord: { lat: 8.9096, lng: -79.5253 },
      },
    ],
    faqs: [
      {
        q: { es: "Puedo llevar catering propio?", en: "Can I bring my own catering?" },
        a: {
          es: "Si. Puedes traer tu catering o te conectamos con proveedores aliados.",
          en: "Yes. You can bring your own catering or we connect you with partner providers.",
        },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-sunset",
  },
  {
    slug: "yate-completo-taboga",
    kind: "charter",
    categories: ["islands", "custom"],
    name: { es: "Yate completo a Taboga", en: "Whole Yacht to Taboga" },
    tagline: {
      es: "Medio dia o dia completo, a tu ritmo.",
      en: "Half day or full day, at your pace.",
    },
    summary: {
      es: "Salida desde Amador, anclaje frente a la isla, banos tranquilos, musica y tiempo privado a bordo.",
      en: "Departure from Amador, anchoring off the island, calm swims, music and private time on board.",
    },
    description: {
      es: "Renta total del yate hacia Taboga por medio dia o dia completo. Tu grupo decide el ritmo: mas bano, mas isla o mas tiempo a bordo.",
      en: "Whole-yacht rental to Taboga for half or full day. Your group sets the pace: more swimming, more island or more time on board.",
    },
    duration: { es: "Medio dia o dia completo", en: "Half or full day" },
    badges: ["family", "snorkel", "celebration"],
    pricing: {
      model: "perBoat",
      priceFrom: 1800,
      baseCapacity: 8,
      maxCapacity: 12,
      extraGuestPrice: 70,
      depositPercent: 30,
    },
    included: [
      { es: "Yate completo para tu grupo", en: "Whole yacht for your group" },
      { es: "Capitan y tripulacion", en: "Captain and crew" },
      { es: "Equipo de snorkel", en: "Snorkel gear" },
      { es: "Agua y hielo", en: "Water and ice" },
    ],
    excluded: [
      { es: "Almuerzo (opcional como upsell)", en: "Lunch (optional add-on)" },
      { es: "Propinas para la tripulacion", en: "Crew gratuities" },
    ],
    itinerary: [
      {
        time: { es: "Flexible", en: "Flexible" },
        title: { es: "Amador a Taboga", en: "Amador to Taboga" },
        detail: {
          es: "Anclaje frente a la isla con tiempo libre a bordo.",
          en: "Anchoring off the island with free time on board.",
        },
        coord: { lat: 8.7997, lng: -79.5589 },
      },
    ],
    faqs: [
      {
        q: { es: "Cual es la capacidad?", en: "What is the capacity?" },
        a: {
          es: "Hasta 12 invitados. El precio base cubre 8 y cada invitado adicional tiene un cargo.",
          en: "Up to 12 guests. The base price covers 8 and each extra guest carries a surcharge.",
        },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-taboga",
  },
  {
    slug: "charter-premium-las-perlas",
    kind: "charter",
    categories: ["islands", "custom", "celebration"],
    name: { es: "Charter premium a Las Perlas", en: "Premium Las Perlas Charter" },
    tagline: {
      es: "El dia completo definitivo entre islas.",
      en: "The ultimate full day among islands.",
    },
    summary: {
      es: "Una experiencia mas amplia para grupos que quieren islas, snorkel y un dia completo fuera de la ciudad.",
      en: "A broader experience for groups who want islands, snorkeling and a full day out of the city.",
    },
    description: {
      es: "Renta total del yate hacia Las Perlas por un dia completo. Islas, snorkel, playas desiertas y una ruta armada alrededor de tu grupo.",
      en: "Whole-yacht rental to Las Perlas for a full day. Islands, snorkeling, empty beaches and a route built around your group.",
    },
    duration: { es: "Dia completo", en: "Full day" },
    badges: ["adventure", "snorkel", "celebration"],
    pricing: {
      model: "perBoat",
      priceFrom: 3200,
      baseCapacity: 8,
      maxCapacity: 12,
      extraGuestPrice: 110,
      depositPercent: 30,
    },
    included: [
      { es: "Yate completo para tu grupo", en: "Whole yacht for your group" },
      { es: "Capitan y tripulacion", en: "Captain and crew" },
      { es: "Equipo de snorkel", en: "Snorkel gear" },
      { es: "Agua, hielo y bebidas basicas", en: "Water, ice and basic drinks" },
    ],
    excluded: [
      { es: "Almuerzo premium (upsell)", en: "Premium lunch (add-on)" },
      { es: "Impuesto de Contadora", en: "Contadora landing fee" },
    ],
    itinerary: [
      {
        time: { es: "Flexible", en: "Flexible" },
        title: { es: "Dia completo entre islas", en: "Full day among islands" },
        detail: {
          es: "Ruta privada por Contadora, Saboga y Mogo Mogo.",
          en: "Private route through Contadora, Saboga and Mogo Mogo.",
        },
        coord: { lat: 8.6283, lng: -79.033 },
      },
    ],
    faqs: [
      {
        q: { es: "Incluye almuerzo?", en: "Is lunch included?" },
        a: {
          es: "El almuerzo premium es un upsell opcional que coordinamos segun tu grupo.",
          en: "Premium lunch is an optional add-on we coordinate based on your group.",
        },
      },
    ],
    gallery: ["/og-atlante.jpg", "/og-atlante.jpg", "/og-atlante.jpg"],
    heroImage: "/og-atlante.jpg",
    cardCrop: "card-perlas",
  },
];

export const toursOnly = tours.filter((t) => t.kind === "tour");
export const chartersOnly = tours.filter((t) => t.kind === "charter");

export function getTour(slug: string): Tour | undefined {
  return tours.find((t) => t.slug === slug);
}
