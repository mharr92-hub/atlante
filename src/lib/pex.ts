/**
 * The single exit point towards Pacific Experience (PEX).
 *
 * Rule (PRD 5.3): every link that leaves Atlante for PEX is built here so that
 * `ref=ATLANTE` and the UTM set travel on 100 % of them. This is the ONLY file
 * allowed to contain the PEX domain as a literal — components that need to show
 * it as text import `PEX_DOMAIN_LABEL`.
 *
 * R1 will extend `target` with the product / checkout deep links and the
 * one-time handoff token (`h=`). Personal data never goes in the query string.
 */

export const PEX_BASE_URL =
  process.env.NEXT_PUBLIC_PEX_BASE_URL ?? "https://www.pacificexperience.lat";

/** Operator brand name, for user-facing copy. */
export const PEX_BRAND = "Pacific Experience";

/** Bare domain, for user-facing copy ("...se completan en pacificexperience.lat"). */
export const PEX_DOMAIN_LABEL = "pacificexperience.lat";

/** Referral code PEX knows Atlante by. */
export const ATLANTE_REF_CODE = "ATLANTE";

export interface BuildPexUrlOptions {
  /** `home` = PEX landing; `path` = a specific PEX route passed in `path`. */
  target: "home" | "path";
  /** Route for `target: "path"`, e.g. "/politicas". Ignored for `home`. */
  path?: string;
  /** Atlante lead id, travels as `ref_id` so PEX can attribute the sale. */
  leadId?: string;
  /** `utm_campaign` value; defaults to "site". */
  campaign?: string;
}

/**
 * Build an attributed URL to PEX. Always carries `ref`, `utm_source`,
 * `utm_medium` and `utm_campaign`; adds `ref_id` only when a lead exists.
 */
export function buildPexUrl(opts: BuildPexUrlOptions): string {
  const base = PEX_BASE_URL.replace(/\/+$/, "");
  const rawPath = opts.target === "path" ? (opts.path ?? "").trim() : "";
  const path = rawPath && !rawPath.startsWith("/") ? `/${rawPath}` : rawPath;

  const url = new URL(`${base}${path}`);
  url.searchParams.set("ref", ATLANTE_REF_CODE);
  url.searchParams.set("utm_source", "atlante");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", opts.campaign ?? "site");
  if (opts.leadId) url.searchParams.set("ref_id", opts.leadId);

  return url.toString();
}
