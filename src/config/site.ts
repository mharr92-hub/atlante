/**
 * Central site configuration for Atlante del Pacifico.
 * Brand, contact, and channels live here so every component reads one source.
 *
 * Rule: nothing here may be invented. Ratings, review counts and response-time
 * promises were removed in R0 because they had no verifiable source.
 */

export const site = {
  name: "Atlante del Pacifico",
  shortName: "Atlante",
  tagline: "del Pacifico",
  domain: "www.atlantedelpacifico.lat",
  url: "https://www.atlantedelpacifico.lat",
  // ES/EN desde el bloque 6.2: el título y la descripción del sitio también
  // cambian con el idioma de la URL.
  titleSuffix: {
    es: "Tours y charters privados en Panama",
    en: "Private tours and charters in Panama",
  },
  description: {
    es: "Atlante del Pacifico conecta viajeros con tours curados y charters privados de yate desde Ciudad de Panama, Taboga y Las Perlas.",
    en: "Atlante del Pacifico connects travelers with curated tours and private yacht charters from Panama City, Taboga and Las Perlas.",
  },
  location: "Marina Flamenco - Amador, Panama",
  // Marina Flamenco, Amador causeway
  geo: { lat: 8.9096, lng: -79.5253 },
  whatsapp: {
    // E.164 without the + sign, as wa.me expects
    number: "50768603623",
    display: "+507 6860 3623",
    defaultMessage: {
      es: "Hola Atlante, quiero informacion sobre tours o charters en Panama.",
      en: "Hi Atlante, I would like information about tours or charters in Panama.",
    },
  },
  social: {
    // PENDIENTE MARK: no verificado que la cuenta exista.
    instagram: "https://instagram.com/atlantedelpacifico",
  },
} as const;

export type NavItem = { href: string; labelEs: string; labelEn: string };

export const navItems: NavItem[] = [
  { href: "/tours", labelEs: "Tours", labelEn: "Tours" },
  { href: "/charters", labelEs: "Charters", labelEn: "Charters" },
  { href: "/#destinos", labelEs: "Destinos", labelEn: "Destinations" },
  { href: "/como-funciona", labelEs: "Cómo funciona", labelEn: "How it works" },
  { href: "/#contacto", labelEs: "Contacto", labelEn: "Contact" },
];

/**
 * The default greeting, in the page language (block 6.2). Spanish is the
 * fallback because it is the site's default locale.
 */
export function whatsappGreeting(locale: "es" | "en" = "es"): string {
  return site.whatsapp.defaultMessage[locale] ?? site.whatsapp.defaultMessage.es;
}

/** Build a wa.me deep link with a pre-filled message. */
export function whatsappUrl(message: string = whatsappGreeting()): string {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
