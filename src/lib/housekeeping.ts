/**
 * Regla automática del bloque 3.4: un lead que se redirigió a PEX y sigue sin
 * pago a los 7 días se da por perdido.
 *
 * La lógica vive aquí, separada de Prisma, para que el cron y los tests usen lo
 * mismo. `HousekeepingDb` es la única dependencia: la ruta la implementa con
 * Prisma, el test con un doble.
 */

/** Días sin pago tras el handoff antes de dar el lead por perdido (PRD 5.8). */
export const LOST_AFTER_DAYS = 7;

/** Todo lead redirigido antes de esta marca ya agotó su plazo. */
export function lostCutoff(now: Date = new Date(), days: number = LOST_AFTER_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export interface HousekeepingDb {
  /** Pasa a `lost` los `redirected` anteriores al corte. Devuelve cuántos. */
  markLost(cutoff: Date): Promise<number>;
}

export interface HousekeepingResult {
  ok: boolean;
  lost: number;
  cutoff: string;
  reason?: string;
}

export async function runLeadsHousekeeping(
  db: HousekeepingDb,
  now: Date = new Date(),
  days: number = LOST_AFTER_DAYS,
): Promise<HousekeepingResult> {
  const cutoff = lostCutoff(now, days);
  try {
    const lost = await db.markLost(cutoff);
    return { ok: true, lost, cutoff: cutoff.toISOString() };
  } catch {
    // La base no responde: no se pierde nada, se reintenta en la próxima corrida.
    return { ok: false, lost: 0, cutoff: cutoff.toISOString(), reason: "db_error" };
  }
}
