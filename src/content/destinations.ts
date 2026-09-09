/**
 * Destinos — "todas las formas de ir" (bloque 6.1).
 *
 * Regla 3 aplicada al contenido de lugares: **aquí no hay ningún dato numérico**.
 * Ni distancias, ni tiempos de travesía, ni temporadas, ni cifras de visitantes.
 * Los únicos números de la página de destino son los que ya viven en el repo con
 * su `verifiedAt`: los precios y las jornadas del catálogo (`content/catalog.ts`)
 * y de las naves (`content/vessels.ts`), que la página lee y muestra tal cual.
 *
 * El texto descriptivo es prosa escrita para este bloque: dice qué es el lugar y
 * en qué se diferencian las formas de llegar, sin prometer nada que Atlante no
 * pueda respaldar con el catálogo.
 *
 * `products` es una lista explícita de slugs porque un `Product` no tiene campo
 * de destino (ni en el código ni en la tabla). Añadir uno sería una migración; la
 * lista se mantiene aquí y queda anotada en el reporte. `route` sí es la clave
 * real de las naves (`Vessel.routes`), así que ese cruce es automático.
 */

import type { Localized } from "@/content/catalog";

export interface Destination {
  slug: string;
  /** Nombre corto para menús y migas. */
  name: Localized;
  /** H1 de la página. */
  title: Localized;
  summary: Localized;
  /** 2–3 párrafos. Sin cifras. */
  paragraphs: Localized[];
  /** Slugs de `content/catalog.ts` que llegan a este destino. */
  products: string[];
  /** Clave de ruta de las naves (`Vessel.routes`). */
  route: string;
  order: number;
}

export const destinations: Destination[] = [
  {
    slug: "taboga",
    route: "taboga",
    products: ["ferry-taboga"],
    name: { es: "Isla Taboga", en: "Taboga Island" },
    title: {
      es: "Taboga: todas las formas de ir",
      en: "Taboga: every way to get there",
    },
    summary: {
      es: "La salida al mar más cercana a la ciudad. En ferry como pasajero o en nave completa con tu grupo.",
      en: "The closest escape to the sea from the city. By ferry as a passenger, or on a whole vessel with your group.",
    },
    paragraphs: [
      {
        es: "Taboga es la isla que se ve desde la costa de la Ciudad de Panamá. Se va y se vuelve el mismo día, hay pueblo para caminar y playa para quedarse, y no hace falta organizar una expedición: se sale de Amador y se llega.",
        en: "Taboga is the island you can see from the coast of Panama City. You go and come back the same day, there is a town to walk and a beach to stay on, and it takes no expedition planning: you leave from Amador and you are there.",
      },
      {
        es: "Hay dos maneras de ir y no compiten, porque son planes distintos. En ferry vas como pasajero: sales de Isla Perico, compras tu boleto y decides el resto. En nave completa vas con tu grupo, sales de Marina Flamenco y el barco es tuyo durante toda la jornada, con capitán y tripulación a bordo.",
        en: "There are two ways to go and they do not compete, because they are different plans. On the ferry you travel as a passenger: you leave from Isla Perico, buy your ticket and decide the rest. On a whole vessel you go with your group, leave from Marina Flamenco and the boat is yours for the whole day, with captain and crew on board.",
      },
      {
        es: "Abajo están las dos, con el precio que publica cada operador. Atlante compara y te lleva; el pago se completa siempre con quien opera la nave.",
        en: "Both are below, with the price each operator publishes. Atlante compares and takes you there; payment is always completed with whoever operates the vessel.",
      },
    ],
    order: 1,
  },
  {
    slug: "las-perlas",
    route: "perlas",
    products: ["ferry-contadora"],
    name: { es: "Las Perlas", en: "Las Perlas" },
    title: {
      es: "Las Perlas: todas las formas de ir",
      en: "Las Perlas: every way to get there",
    },
    summary: {
      es: "El archipiélago, mar adentro. Hoy se llega en nave completa; el ferry a Contadora está publicado pero sin venta.",
      en: "The archipelago, out at sea. Today you get there on a whole vessel; the Contadora ferry is listed but not on sale.",
    },
    paragraphs: [
      {
        es: "El archipiélago de Las Perlas está mar adentro, lejos de la bahía y de la ciudad. Contadora es su isla conocida y la puerta de entrada al resto del archipiélago. No es un plan de tarde: es el destino que pide el día entero.",
        en: "The Las Perlas archipelago lies out at sea, away from the bay and the city. Contadora is its best-known island and the gateway to the rest of the archipelago. This is not an afternoon plan: it is the destination that asks for a whole day.",
      },
      {
        es: "Por eso la forma de ir que existe hoy es la nave completa: se sale de Marina Flamenco con tu grupo y la jornada publicada hacia Las Perlas es la más larga de las tres rutas. El ferry a Contadora está en el catálogo del operador, pero hoy figura como no disponible; en cuanto vuelva a venderse aparece aquí con su precio.",
        en: "That is why the way to go today is the whole vessel: you leave from Marina Flamenco with your group and the published day trip to Las Perlas is the longest of the three routes. The Contadora ferry is in the operator's catalog, but today it is listed as unavailable; as soon as it is on sale again it will appear here with its price.",
      },
      {
        es: "Abajo están las opciones con precio publicado. Atlante no cobra: el pago se completa con quien opera la nave.",
        en: "The options with a published price are below. Atlante never charges: payment is completed with whoever operates the vessel.",
      },
    ],
    order: 2,
  },
  {
    slug: "bahia",
    route: "bahia",
    products: ["tour-bahia", "party-bahia"],
    name: { es: "Bahía de Panamá", en: "Bay of Panama" },
    title: {
      es: "Bahía de Panamá: todas las formas de ir",
      en: "Bay of Panama: every way to sail it",
    },
    summary: {
      es: "Navegar con la ciudad de fondo. Tour al atardecer, fiesta a bordo o nave completa para tu grupo.",
      en: "Sailing with the city behind you. Evening tour, party on board or a whole vessel for your group.",
    },
    paragraphs: [
      {
        es: "La Bahía de Panamá se navega con la ciudad delante: la línea de edificios, el Puente de las Américas y la entrada del canal. Es la ruta más corta y la que se puede hacer sin reservar el día entero.",
        en: "The Bay of Panama is sailed with the city in front of you: the skyline, the Bridge of the Americas and the entrance to the canal. It is the shortest route and the one you can do without booking a whole day.",
      },
      {
        es: "Es también la más flexible. En ticket por persona hay recorrido con salidas al caer la tarde y de noche, y una fiesta a bordo los fines de semana; en nave completa se renta el barco para tu grupo y la ruta de la bahía es la jornada más corta que publican los operadores.",
        en: "It is also the most flexible. As a per-person ticket there is a cruise with late-afternoon and night departures, and a party on board at weekends; as a whole vessel you charter the boat for your group, and the bay route is the shortest day the operators publish.",
      },
      {
        es: "Abajo están todas, con el precio real de cada una. Eliges aquí y el pago se completa con el operador.",
        en: "All of them are below, with their real price. You choose here and payment is completed with the operator.",
      },
    ],
    order: 3,
  },
];

export function getDestination(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}

/** Slugs en el orden de publicación; los usan el sitemap y la home. */
export const destinationSlugs = destinations
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((d) => d.slug);
