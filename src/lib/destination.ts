/**
 * A dónde manda Atlante a la persona al salir hacia Pacific Experience.
 *
 * Es la única regla de decisión entre modo puente y modo integrado, y vive
 * aparte de `lib/leads.ts` (que es `server-only`) porque la usan tres sitios: el
 * servidor al crear el lead, el funnel cuando `POST /api/leads` falla, y
 * `/listo` cuando se recarga la pantalla sin `sessionStorage`.
 *
 * La URL en sí la arma siempre `buildPexUrl()` (regla 6): aquí sólo se elige el
 * `target` y qué datos lleva.
 */
import type { Product } from "@/content/catalog";
import { buildPexUrl } from "@/lib/pex";
import type { SlotOption } from "@/lib/slots";

export interface DestinationOptions {
  addons?: string[];
  /** `ref_id`: sin lead guardado no viaja. */
  leadId?: string;
  /** `h`: token de un solo uso para el prellenado. */
  handoffToken?: string;
  /** Salida real del feed; su presencia activa el deep link al checkout. */
  slot?: SlotOption | null;
  /** Total de pasajeros, para `tickets=`. */
  tickets?: number;
}

/** `trip_id` de PEX del producto, o `null` si es una nave o no se conoce. */
export function tripIdOf(product: Product): string | null {
  return product.pexCheckout?.kind === "tour" ? product.pexCheckout.tripId : null;
}

/**
 * Modo integrado: con salida real y `trip_id` conocido, deep link directo al
 * checkout de PEX con `slot_id`, `date` y `tickets`.
 * Modo puente: la página del producto, o el checkout de la nave si es un chárter.
 *
 * Sin `trip_id` no hay deep link posible (PEX aterrizaría en un checkout vacío),
 * así que se degrada a la página del producto aunque haya salida sincronizada.
 */
export function pexDestination(product: Product, opts: DestinationOptions = {}): string {
  const { addons = [], leadId, handoffToken, slot, tickets } = opts;
  const isCharter = product.kind === "charter_pex";
  const tripId = tripIdOf(product);

  if (!isCharter && slot && tripId) {
    return buildPexUrl({
      target: "tour_checkout",
      tripId,
      slotId: slot.id,
      date: slot.date,
      tickets,
      addons,
      leadId,
      handoffToken,
      campaign: product.slug,
    });
  }

  return buildPexUrl({
    target: isCharter ? "charter_checkout" : "tour_page",
    path: product.pexPath,
    vessel: product.pexCheckout?.kind === "charter" ? product.pexCheckout.vessel : undefined,
    addons,
    leadId,
    handoffToken,
    campaign: product.slug,
  });
}
