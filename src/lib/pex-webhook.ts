/**
 * Validación del webhook de Pacific Experience (PRD 5.5, cambio X5 del anexo).
 *
 * Aquí sólo hay funciones puras sobre el cuerpo crudo y las cabeceras: firma,
 * ventana de tiempo, forma del cuerpo e idempotencia. La ruta
 * (`/api/pex/booking-confirmed`) las usa y se ocupa de Prisma; los tests las
 * usan sin base de datos.
 *
 * Firma: `x-pex-signature = HMAC-SHA256(`${timestamp}.${body}`, PEX_WEBHOOK_SECRET)`
 * con `x-pex-timestamp` en milisegundos epoch. Se rechaza cualquier evento con
 * más de 5 minutos de desfase, en cualquiera de los dos sentidos.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Desfase máximo tolerado entre `x-pex-timestamp` y el reloj de Atlante. */
export const MAX_SKEW_MS = 5 * 60 * 1000;

export interface WebhookBody {
  event?: string;
  pex_booking_id?: string;
  ref_id?: string;
  service_date?: string;
  amount?: number;
  customer_email_sha256?: string;
  product?: { name?: string };
}

export type WebhookCheck =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** La firma que PEX tiene que mandar. Se usa en los tests y en la documentación. */
export function signWebhook(timestamp: string | number, rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

function equals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface VerifyInput {
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  secret: string;
  now?: number;
}

/**
 * Timestamp primero (400) y firma después (401), para que un reloj desfasado no
 * se confunda con un intento de falsificación.
 */
export function verifyWebhook(input: VerifyInput): WebhookCheck {
  if (!input.secret) return { ok: false, status: 503, error: "not_configured" };

  const ts = Number(input.timestamp ?? "");
  const now = input.now ?? Date.now();
  if (!input.timestamp || !Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) {
    return { ok: false, status: 400, error: "stale_timestamp" };
  }

  if (!input.signature) return { ok: false, status: 401, error: "bad_signature" };
  if (!equals(input.signature, signWebhook(input.timestamp, input.rawBody, input.secret))) {
    return { ok: false, status: 401, error: "bad_signature" };
  }

  return { ok: true };
}

export type ParsedBody =
  | { ok: true; body: WebhookBody; event: string; bookingId: string }
  | { ok: false; status: number; error: string };

/** Cuerpo válido = JSON con `event` y `pex_booking_id`. */
export function parseWebhookBody(rawBody: string): ParsedBody {
  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return { ok: false, status: 400, error: "bad_json" };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "bad_json" };
  }

  const event = typeof body.event === "string" ? body.event : "";
  const bookingId = typeof body.pex_booking_id === "string" ? body.pex_booking_id : "";
  if (!event || !bookingId) {
    return { ok: false, status: 400, error: "missing_fields" };
  }

  return { ok: true, body, event, bookingId };
}

/**
 * Un reenvío de PEX choca con el único `(pexBookingId, eventType)` de
 * `PexEvent`: Prisma lo reporta como P2002 y la respuesta es 200 sin duplicar.
 */
export function isDuplicateEvent(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}

/** Comisión en dólares, redondeada a centavos. */
export function commissionFor(amount: number, pct: number): number {
  return Math.round(((amount * pct) / 100) * 100) / 100;
}

/** Los eventos que revierten la comisión (PRD 5.5). */
export function isRevertEvent(event: string): boolean {
  return event === "booking.cancelled" || event === "booking.refunded";
}
