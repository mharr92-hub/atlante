/**
 * Capa mínima de analítica (PRD 5.12).
 *
 * `track()` empuja el evento a `window.dataLayer` (que GTM y GA4 leen), lo
 * repite como evento de GA4 si `gtag` está cargado y lo manda a Meta si `fbq`
 * existe. Sin GA ni Pixel configurados no hace nada; en el servidor es no-op.
 *
 * Nunca se envían nombre, correo ni teléfono: sólo identificadores y montos.
 */

type Params = Record<string, string | number | boolean | null | undefined>;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

export type AnalyticsEvent =
  | "view_catalog"
  | "view_product"
  | "funnel_step"
  | "lead_created"
  | "redirect_to_pex"
  // Cotización de una nave aliada (PRD 5.12 / bloque 4.2).
  | "quote_requested"
  | "whatsapp_click";

export function track(event: AnalyticsEvent, params: Params = {}): void {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;

  try {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ event, ...params });

    if (typeof w.gtag === "function") w.gtag("event", event, params);

    if (typeof w.fbq === "function") {
      // Los eventos estándar de Meta que aplican son los dos que crean un lead.
      if (event === "lead_created" || event === "quote_requested") {
        w.fbq("track", "Lead", params);
      }
      else w.fbq("trackCustom", event, params);
    }
  } catch {
    // La analítica nunca puede romper la navegación ni el handoff a PEX.
  }
}
