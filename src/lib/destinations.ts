/**
 * Cruce destino ↔ catálogo (bloque 6.1).
 *
 * Funciones puras, sin Prisma y sin `server-only`: las usan la página de destino
 * (servidor) y los tests. No calculan precios ni escriben texto: sólo eligen qué
 * productos y qué naves pertenecen a un destino.
 */
import type { Product } from "@/content/catalog";
import type { Destination } from "@/content/destinations";
import type { Vessel } from "@/content/vessels";

export interface DestinationProducts {
  /** Lo que el operador está vendiendo: sale con precio y con CTA. */
  available: Product[];
  /** Lo que existe en el catálogo pero hoy no se vende: sólo el nombre. */
  unavailable: Product[];
}

/**
 * Los productos del destino, separados por disponibilidad y en el orden del
 * catálogo. Un slug de la lista que ya no exista en el catálogo se ignora.
 */
export function productsForDestination(
  destination: Destination,
  products: Product[],
): DestinationProducts {
  const wanted = new Set(destination.products);
  const mine = products
    .filter((p) => wanted.has(p.slug))
    .sort((a, b) => a.order - b.order);

  return {
    available: mine.filter((p) => p.available),
    unavailable: mine.filter((p) => !p.available),
  };
}

/** Las naves activas cuya ruta incluye el destino, en el orden del marketplace. */
export function vesselsForDestination(
  destination: Destination,
  vessels: Vessel[],
): Vessel[] {
  return vessels
    .filter((v) => v.active && v.routes.includes(destination.route))
    .sort((a, b) => a.order - b.order);
}
