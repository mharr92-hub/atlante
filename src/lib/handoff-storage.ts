/**
 * Lo que el funnel le deja a la pantalla `/listo`.
 *
 * Va por `sessionStorage`, no por la URL: el destino lleva el `ref_id` y el
 * token de handoff, y ninguno de los dos tiene por qué quedar en el historial
 * ni en un `Referer` (regla 7 / principio 6).
 */
import type { Product } from "@/content/catalog";
import { buildPexUrl } from "@/lib/pex";
import type { Pax } from "@/lib/funnel";

export const HANDOFF_KEY = "atl_handoff";

export interface HandoffPayload {
  slug: string;
  date: string;
  slot: string;
  pax: Pax;
  addons: string[];
  total: number;
  destinationUrl: string;
  leadId: string | null;
}

/**
 * Destino cuando no hay lead: `POST /api/leads` falló, tardó más de 4 s o la
 * persona recargó `/listo`. Lleva `ref=ATLANTE` igual, sin `ref_id`.
 */
export function destinationFallback(product: Product, addons: string[] = []): string {
  const isCharter = product.kind === "charter_pex";
  return buildPexUrl({
    target: isCharter ? "charter_checkout" : "tour_page",
    path: product.pexPath,
    vessel: product.pexCheckout?.kind === "charter" ? product.pexCheckout.vessel : undefined,
    addons,
    campaign: product.slug,
  });
}

export function readHandoff(): HandoffPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as HandoffPayload) : null;
  } catch {
    return null;
  }
}
