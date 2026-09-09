/**
 * Salidas reales (modo integrado). Lo comparten el funnel (cliente), la página
 * de reserva (servidor) y `POST /api/leads`, así que aquí no entra Prisma ni
 * `server-only`: sólo tipos planos y funciones puras.
 *
 * Mientras el feed de PEX no exista (cambio X4), la lista llega vacía y todo se
 * comporta como en el bloque 2: modo puente con el calendario por `schedule`.
 */

export interface SlotOption {
  /** `ProductSlot.pexSlotId`: el identificador que entiende el checkout de PEX. */
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM`. */
  start: string;
  end?: string;
  capacityRemaining: number;
  price?: number;
}

/** Un snapshot más viejo que esto no manda: se vuelve al modo puente. */
export const SLOTS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** ¿El snapshot sirve? Sin salidas o con `syncedAt` viejo, no. */
export function slotsAreFresh(
  slots: SlotOption[],
  syncedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (slots.length === 0) return false;
  if (!syncedAt) return false;
  return now.getTime() - syncedAt.getTime() < SLOTS_MAX_AGE_MS;
}

/** Días con al menos una salida con cupo para `pax` personas. */
export function datesWithCapacity(slots: SlotOption[], pax = 1): string[] {
  const dates = new Set<string>();
  for (const slot of slots) {
    if (slot.capacityRemaining >= pax) dates.add(slot.date);
  }
  return [...dates].sort();
}

/** Todos los días con salida publicada, tengan cupo o no. */
export function datesWithSlots(slots: SlotOption[]): string[] {
  return [...new Set(slots.map((s) => s.date))].sort();
}

/** Las salidas de un día, ordenadas por hora. */
export function slotsForDate(slots: SlotOption[], date: string): SlotOption[] {
  return slots
    .filter((s) => s.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function findSlot(slots: SlotOption[], id: string): SlotOption | undefined {
  return slots.find((s) => s.id === id);
}

/** Cupo máximo del día (la salida más holgada). */
export function capacityForDate(slots: SlotOption[], date: string): number {
  return slotsForDate(slots, date).reduce((max, s) => Math.max(max, s.capacityRemaining), 0);
}

/**
 * Las próximas `limit` fechas con cupo para `pax` a partir de `from`
 * (excluida). Es lo que el paso 2 ofrece como botones cuando el grupo no cabe.
 */
export function nextDatesWithCapacity(
  slots: SlotOption[],
  from: string,
  pax: number,
  limit = 3,
): string[] {
  return datesWithCapacity(slots, pax)
    .filter((date) => date > from)
    .slice(0, limit);
}

/** La primera fecha utilizable: con cupo si la hay; si no, la primera con salida. */
export function firstSlotDate(slots: SlotOption[], pax = 1): string | null {
  return datesWithCapacity(slots, pax)[0] ?? datesWithSlots(slots)[0] ?? null;
}
