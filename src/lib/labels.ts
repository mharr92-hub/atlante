/**
 * Nombre legible de un `slug` de lead, venga del catálogo o del marketplace.
 *
 * Un `Lead` guarda `productSlug` (ticketería) o `vesselSlug` (charters), y las
 * tablas y los CSV del admin necesitan un solo resolvedor para los dos.
 */
import "server-only";
import { productLabels } from "@/lib/catalog";
import { vesselLabels } from "@/lib/vessels";

export async function slugLabels(): Promise<(slug: string) => string> {
  const [product, vessel] = await Promise.all([productLabels(), vesselLabels()]);
  return (slug: string) => {
    // Los dos devuelven el slug tal cual cuando no lo conocen.
    const fromVessel = vessel(slug);
    return fromVessel === slug ? product(slug) : fromVessel;
  };
}
