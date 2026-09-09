/**
 * Aviso al concierge por cada lead nuevo (bloque 3.4).
 *
 * Atlante no contrata servicios pagos (regla 8), así que el único proveedor
 * implementado es `log`: escribe una línea en la consola del servidor, que en
 * Vercel queda en los logs de la función. La interfaz `NotifyProvider` está
 * lista para enchufar email (Resend) o WhatsApp (Twilio) el día que Mark decida
 * cuál — ver PENDIENTE MARK del reporte del bloque 3.
 *
 * Regla 7: aquí NO entran nombre, correo ni teléfono. El aviso dice qué se
 * reservó y con qué id; los datos de contacto se ven en `/admin/leads`, detrás
 * de la contraseña.
 */
import "server-only";

export interface NewLeadNotification {
  leadId: string;
  productSlug: string;
  productName: string;
  /** `YYYY-MM-DD` de la fecha de servicio, si el producto la pide. */
  serviceDate: string | null;
  timeSlot: string | null;
  paxTotal: number;
  /** Total estimado en USD, tal como lo calculó el servidor. */
  total: number;
  mode: "puente" | "integrado";
}

export interface NotifyProvider {
  readonly name: string;
  /** Nunca lanza: un fallo del aviso no puede tumbar la creación del lead. */
  newLead(payload: NewLeadNotification): Promise<void>;
}

/** Resumen de una línea, sin datos personales. */
export function formatNewLead(payload: NewLeadNotification): string {
  const parts = [
    `lead ${payload.leadId}`,
    payload.productName,
    payload.serviceDate ?? "sin fecha",
    payload.timeSlot ?? null,
    `${payload.paxTotal} pax`,
    `estimado $${payload.total}`,
    `modo ${payload.mode}`,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Proveedor por defecto: consola del servidor. Gratis y siempre disponible. */
export const logProvider: NotifyProvider = {
  name: "log",
  async newLead(payload) {
    console.info(`[notify] ${formatNewLead(payload)}`);
  },
};

let provider: NotifyProvider = logProvider;

/**
 * Sustituye el proveedor (tests, o el día que exista email/WhatsApp real).
 * Devuelve el anterior para poder restaurarlo.
 */
export function setNotifyProvider(next: NotifyProvider): NotifyProvider {
  const previous = provider;
  provider = next;
  return previous;
}

export function getNotifyProvider(): NotifyProvider {
  return provider;
}

/** Avisa del lead nuevo. Traga cualquier error: el handoff manda. */
export async function notifyNewLead(payload: NewLeadNotification): Promise<void> {
  try {
    await provider.newLead(payload);
  } catch {
    console.warn("[notify] no se pudo enviar el aviso del lead");
  }
}
