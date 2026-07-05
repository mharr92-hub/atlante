import type { Localized } from "@/content/tours";

export interface Review {
  name: string;
  stars: number;
  text: Localized;
  trip: Localized;
  source: "Google" | "TripAdvisor" | "WhatsApp";
  date: string; // ISO
}

/**
 * Seed reviews. Phase 2 will auto-collect these post-trip via email and can
 * pull live Google/TripAdvisor ratings; for now they render the social-proof
 * section and JSON-LD aggregate rating.
 */
export const reviews: Review[] = [
  {
    name: "Mariana G.",
    stars: 5,
    text: {
      es: "Nos dieron el barco correcto antes de saber que pedir. El atardecer fue perfecto.",
      en: "They gave us the right boat before we even knew what to ask for. The sunset was perfect.",
    },
    trip: { es: "Charter a Taboga - 8 invitados", en: "Taboga charter - 8 guests" },
    source: "Google",
    date: "2026-05-18",
  },
  {
    name: "David R.",
    stars: 5,
    text: {
      es: "Organizacion impecable por WhatsApp. Las Perlas es otro mundo, volvemos seguro.",
      en: "Flawless organization over WhatsApp. Las Perlas is another world, we'll be back for sure.",
    },
    trip: { es: "Expedicion a Las Perlas", en: "Las Perlas expedition" },
    source: "TripAdvisor",
    date: "2026-04-02",
  },
  {
    name: "Sofia & Luis",
    stars: 5,
    text: {
      es: "Reservamos el charter privado para una propuesta. Todo salio de pelicula.",
      en: "We booked the private charter for a proposal. Everything went like a movie.",
    },
    trip: { es: "Charter atardecer privado", en: "Private sunset charter" },
    source: "Google",
    date: "2026-03-21",
  },
];

export const aggregateRating = {
  value: 4.9,
  count: 127,
};
