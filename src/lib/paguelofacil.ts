/**
 * PagueloFácil "Enlace de Pago" client — ported from catamaran-rentals
 * (PEX `PaymentsService`: createPagueloFacilLink, handlePagueloFacilReturn,
 * handlePagueloFacilWebhook, verifyPagueloFacilTransaction).
 *
 * TODO: keep this file aligned with
 * `catamaran-rentals/backend/src/modules/payments/payments.service.ts`
 * when porting remaining PEX behavior (reconciliation cron, expired-recovery
 * mark-paid, charter deposit emails).
 *
 * Pattern (not static button links):
 *  1. Server POST to LinkDeamon.cfm → single-use hosted checkout URL
 *  2. Browser redirects to that URL
 *  3. PF hits RETURN_URL (GET) and/or webhook (POST) with Oper
 *  4. We confirm ONLY via MerchantTransactions S2S — never trust browser params
 *
 * Auth quirk (PEX 2026-07-29): MerchantTransactions expects the RAW API token
 * in Authorization — NOT "Bearer <token>". "Bearer" returns 410 Invalid Api Key.
 */
import "server-only";

export const PF_LINK_EXPIRES_IN_SECONDS = 900;

export interface PagueloFacilConfig {
  cclw: string;
  apiUrl: string;
  returnUrl: string;
  apiToken: string;
  verifyUrl: string;
}

export interface CreateLinkInput {
  amountUsd: number;
  description: string;
  /** Bound to the request id; echoed back as PARM_1. Max 150 chars. */
  parm1: string;
}

export interface CreateLinkResult {
  url: string;
  code: string;
}

export type VerifyResult =
  | { ok: true; oper: string; amount: number; parm1: string | null; status: string }
  | { ok: false; reason: string };

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Hex-encode a UTF-8 string (PF RETURN_URL requirement). */
export function toHex(value: string): string {
  return Buffer.from(value, "utf8").toString("hex");
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Oper / codOper must be alphanumeric + hyphen/underscore. Quotes or spaces
 * never reach the S2S query (PEX injection guard).
 */
export function isSafeOper(oper: string): boolean {
  return /^[A-Za-z0-9_-]{4,80}$/.test(oper);
}

/**
 * PF status whitelist. Numeric 1 is approved (prod incident 2026-07-31:
 * status=1 was rejected when only text "Aprobada" was accepted).
 */
export function isApprovedStatus(status: unknown): boolean {
  if (status === 1 || status === "1") return true;
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  return (
    s === "aprobada" ||
    s === "aprobado" ||
    s === "approved" ||
    s === "success" ||
    s === "completed"
  );
}

/** Public origin for customer redirects (never concatenate onto an already-absolute path). */
export function appOrigin(req?: Request): string {
  const configured =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    "";
  if (configured) return trimSlash(configured);
  if (req) return new URL(req.url).origin;
  return "";
}

export function resolvePagueloFacilConfig(): PagueloFacilConfig | null {
  const cclw = process.env.PAGUELOFACIL_CCLW?.trim() ?? "";
  const apiToken = process.env.PAGUELOFACIL_API_TOKEN?.trim() ?? "";
  const apiUrl =
    process.env.PAGUELOFACIL_API_URL?.trim() ||
    "https://secure.paguelofacil.com/LinkDeamon.cfm";
  const verifyUrl =
    process.env.PAGUELOFACIL_VERIFY_URL?.trim() || "https://admin.paguelofacil.com";

  const publicApp =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    "";
  const returnUrl =
    process.env.PAGUELOFACIL_RETURN_URL?.trim() ||
    (publicApp ? `${trimSlash(publicApp)}/api/payments/paguelofacil/return` : "");

  if (!cclw || !apiToken || !returnUrl) return null;
  return { cclw, apiUrl, returnUrl, apiToken, verifyUrl: trimSlash(verifyUrl) };
}

export function getPagueloFacilAvailability(): { available: boolean } {
  return { available: resolvePagueloFacilConfig() !== null };
}

export async function createPagueloFacilLink(
  input: CreateLinkInput,
): Promise<CreateLinkResult> {
  const cfg = resolvePagueloFacilConfig();
  if (!cfg) {
    throw new Error("paguelofacil_not_configured");
  }
  if (!(input.amountUsd >= 1)) {
    throw new Error("paguelofacil_amount_too_small");
  }

  const body = new URLSearchParams({
    CCLW: cfg.cclw,
    CMTN: formatMoney(input.amountUsd),
    CDSC: input.description.slice(0, 150),
    RETURN_URL: toHex(cfg.returnUrl),
    PARM_1: input.parm1.slice(0, 150),
    EXPIRES_IN: String(PF_LINK_EXPIRES_IN_SECONDS),
  });

  const res = await fetch(cfg.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "*/*",
    },
    body: body.toString(),
  });

  const raw = await res.text();
  let parsed: {
    success?: boolean;
    data?: { url?: string; code?: string };
    headerStatus?: { description?: string };
  } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("paguelofacil_invalid_response");
  }

  const url = parsed.data?.url;
  const code = parsed.data?.code;
  if (!res.ok || parsed.success === false || !url || !code) {
    throw new Error(parsed.headerStatus?.description || "paguelofacil_link_rejected");
  }
  return { url, code };
}

function pickOper(query: Record<string, unknown>): string {
  const raw = query.Oper ?? query.oper ?? query.codOper ?? query.CodOper ?? "";
  return String(raw).trim();
}

function pickParm1(query: Record<string, unknown>): string {
  const raw = query.PARM_1 ?? query.parm_1 ?? query.Parm_1 ?? "";
  return String(raw).trim();
}

export async function verifyPagueloFacilTransaction(oper: string): Promise<VerifyResult> {
  const cfg = resolvePagueloFacilConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };
  if (!isSafeOper(oper)) return { ok: false, reason: "bad_oper" };

  const url = `${cfg.verifyUrl}/rest/merchant-transactions?filter=codOper::${encodeURIComponent(oper)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        // RAW token — do not prefix with "Bearer ".
        Authorization: cfg.apiToken,
        Accept: "application/json",
      },
    });
  } catch {
    return { ok: false, reason: "s2s_unreachable" };
  }

  const raw = await res.text();
  if (!res.ok) return { ok: false, reason: `s2s_http_${res.status}` };

  let parsed: { success?: boolean; data?: unknown } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { ok: false, reason: "s2s_invalid_json" };
  }

  const rows = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data
      ? [parsed.data]
      : [];
  const row = rows.find((r) => r && typeof r === "object") as
    | {
        codOper?: string;
        status?: unknown;
        Estado?: unknown;
        total?: unknown;
        TotalPagado?: unknown;
        PARM_1?: unknown;
      }
    | undefined;
  if (!row) return { ok: false, reason: "s2s_empty" };

  const status = row.status ?? row.Estado;
  if (!isApprovedStatus(status)) {
    return { ok: false, reason: "not_approved" };
  }

  const amount = Number(row.total ?? row.TotalPagado);
  if (!Number.isFinite(amount)) return { ok: false, reason: "bad_amount" };

  return {
    ok: true,
    oper: String(row.codOper ?? oper),
    amount,
    parm1: row.PARM_1 != null ? String(row.PARM_1) : null,
    status: String(status),
  };
}

export function extractPfHints(payload: Record<string, unknown>): {
  oper: string;
  parm1: string;
} {
  return { oper: pickOper(payload), parm1: pickParm1(payload) };
}

/** Amounts must match within 1 cent (float-safe). */
export function amountsMatch(expected: number, actual: number): boolean {
  return Math.abs(expected - actual) < 0.015;
}
