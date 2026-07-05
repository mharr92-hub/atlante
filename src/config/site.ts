/**
 * Central site configuration for Atlante del Pacifico.
 * Brand, contact, and channels live here so every component reads one source.
 */

export const site = {
  name: "Atlante del Pacifico",
  shortName: "Atlante",
  tagline: "del Pacifico",
  domain: "atlantedelpacifico.com",
  url: "https://atlantedelpacifico.com",
  description:
    "Atlante del Pacifico conecta viajeros con tours curados y charters privados de yate desde Ciudad de Panama, Taboga y Las Perlas.",
  email: "concierge@atlantedelpacifico.com",
  location: "Marina Flamenco - Amador, Panama",
  // Marina Flamenco, Amador causeway
  geo: { lat: 8.9096, lng: -79.5253 },
  whatsapp: {
    // E.164 without the + sign, as wa.me expects
    number: "50768603623",
    display: "+507 6860 3623",
    defaultMessage:
      "Hola Atlante, quiero informacion sobre tours o charters en Panama.",
  },
  social: {
    instagram: "https://instagram.com/atlantedelpacifico",
    // Google Business Profile place link (replace with the real place id when live)
    google: "https://maps.google.com/?q=Marina+Flamenco+Amador+Panama",
    tripadvisor: "",
  },
  // Trust indicators shown in the hero and footer
  trust: {
    googleRating: 4.9,
    reviewCount: 127,
    experiences: 200,
    avgResponseMinutes: 14,
  },
} as const;

export type NavItem = { href: string; labelEs: string; labelEn: string };

export const navItems: NavItem[] = [
  { href: "/#travesias", labelEs: "Tours", labelEn: "Tours" },
  { href: "/#destinos", labelEs: "Destinos", labelEn: "Destinations" },
  { href: "/#charters", labelEs: "Charters", labelEn: "Charters" },
  { href: "/#nosotros", labelEs: "Nosotros", labelEn: "About" },
  { href: "/#contacto", labelEs: "Contacto", labelEn: "Contact" },
];

/** Build a wa.me deep link with a pre-filled message. */
export function whatsappUrl(message: string = site.whatsapp.defaultMessage): string {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}
