/**
 * Nombres de las cookies de atribución de la primera visita.
 *
 * Viven en su propio archivo porque los usan tres entornos distintos: el proxy
 * (edge), las APIs (servidor) y el funnel (navegador). Importarlos desde
 * `src/proxy.ts` arrastraría `next/server` al bundle del cliente.
 */
export const UTM_COOKIE = "atl_utm";
export const PARTNER_COOKIE = "atl_partner";
export const LANDING_COOKIE = "atl_landing";

/** 30 días, como pide el PRD 5.9. */
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 30;
