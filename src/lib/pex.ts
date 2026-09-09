/**
 * The single exit point towards Pacific Experience (PEX).
 *
 * Rule (PRD 5.3 / principio 2): every link that leaves Atlante for PEX is built
 * here so that `ref=ATLANTE` and the UTM set travel on 100 % of them. This is
 * the ONLY file allowed to contain the PEX domain as a literal (plus
 * `src/content/catalog.ts`, where it is a `sourceUrl` datum, not a link);
 * `scripts/check-pex-links.mjs` fails the build otherwise.
 *
 * Personal data NEVER goes in the query string (principio 6): the prefill
 * travels as a one-time handoff token (`h=`) that PEX resolves server to server
 * against `GET /api/handoff/[token]`.
 */

export const PEX_BASE_URL =
  process.env.NEXT_PUBLIC_PEX_BASE_URL ?? "https://www.pacificexperience.lat";

/** Operator brand name, for user-facing copy. */
export const PEX_BRAND = "Pacific Experience";

/** Bare domain, for user-facing copy and the GA4 cross-domain linker. */
export const PEX_DOMAIN_LABEL = "pacificexperience.lat";

/** Referral code PEX knows Atlante by. */
export const ATLANTE_REF = "ATLANTE";

/** Backwards-compatible alias (R0 name). */
export const ATLANTE_REF_CODE = ATLANTE_REF;

export type PexTarget =
  | "home"
  | "path"
  | "tour_page"
  | "tour_checkout"
  | "charter_page"
  | "charter_checkout";

export interface BuildPexUrlOptions {
  target: PexTarget;
  /** Route for `path` / `tour_page` / `charter_page`, e.g. "/ferry/bahia". */
  path?: string;
  /** PEX trip id. Without it, `tour_checkout` falls back to the product page. */
  tripId?: string | null;
  slotId?: string;
  /** `YYYY-MM-DD`. */
  date?: string;
  tickets?: number;
  /** Vessel slug for `charter_checkout`, e.g. "aura". */
  vessel?: string;
  /** Add-on slugs; each one travels as its own `addon=` parameter. */
  addons?: string[];
  /** Atlante lead id, travels as `ref_id` so PEX can attribute the sale. */
  leadId?: string;
  /** One-time handoff token, travels as `h`. */
  handoffToken?: string;
  /** `utm_campaign` value; defaults to "site". */
  campaign?: string;
}

function normalizePath(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Build an attributed URL to PEX. Always carries `ref` and the UTM set; adds
 * `ref_id` / `h` only when they exist, and one `addon` per selected add-on.
 * No other parameter is ever appended.
 */
export function buildPexUrl(opts: BuildPexUrlOptions): string {
  const base = PEX_BASE_URL.replace(/\/+$/, "");

  // `tour_checkout` without a trip id cannot deep-link: PEX would land on an
  // empty checkout. Degrade to the product page (modo puente).
  const target: PexTarget =
    opts.target === "tour_checkout" && !opts.tripId ? "tour_page" : opts.target;

  let path = "";
  const params = new URLSearchParams();

  switch (target) {
    case "home":
      break;
    case "path":
    case "tour_page":
    case "charter_page":
      path = normalizePath(opts.path);
      break;
    case "tour_checkout":
      path = "/tours/checkout";
      if (opts.tripId) params.set("trip_id", opts.tripId);
      if (opts.slotId) params.set("slot_id", opts.slotId);
      if (opts.date) params.set("date", opts.date);
      if (opts.tickets && opts.tickets > 0) params.set("tickets", String(opts.tickets));
      break;
    case "charter_checkout":
      path = "/charter/checkout";
      if (opts.vessel) params.set("vessel", opts.vessel);
      break;
  }

  params.set("ref", ATLANTE_REF);
  params.set("utm_source", "atlante");
  params.set("utm_medium", "referral");
  params.set("utm_campaign", opts.campaign ?? "site");
  if (opts.leadId) params.set("ref_id", opts.leadId);
  if (opts.handoffToken) params.set("h", opts.handoffToken);
  for (const addon of opts.addons ?? []) {
    if (addon) params.append("addon", addon);
  }

  return `${base}${path}?${params.toString()}`;
}
