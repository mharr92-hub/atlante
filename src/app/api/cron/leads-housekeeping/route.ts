import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron";
import { getDb } from "@/lib/db";
import { runLeadsHousekeeping, type HousekeepingDb } from "@/lib/housekeeping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario del bloque 3.4: los leads que se redirigieron a PEX y llevan más
 * de 7 días sin pago pasan a `lost`.
 *
 * Sólo toca `redirected`: un `created` nunca llegó al handoff y un `paid` o
 * `paid_unmatched` ya está conciliado. Mark puede revivir cualquiera desde
 * `/admin/leads`.
 */
export async function GET(request: Request) {
  const auth = authorizeCron(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ ok: false, reason: "no_database" });

  const target: HousekeepingDb = {
    async markLost(cutoff) {
      const { count } = await db.lead.updateMany({
        where: {
          status: "redirected",
          paidAt: null,
          // Sin `redirectedAt` (el aviso del cliente no llegó) manda la creación.
          OR: [{ redirectedAt: { lt: cutoff } }, { redirectedAt: null, createdAt: { lt: cutoff } }],
        },
        data: { status: "lost", commissionAmount: 0 },
      });
      return count;
    },
  };

  const result = await runLeadsHousekeeping(target);
  return NextResponse.json(result);
}
