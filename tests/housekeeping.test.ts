/**
 * Regla automática de los 7 días (bloque 3.4).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { LOST_AFTER_DAYS, lostCutoff, runLeadsHousekeeping } from "@/lib/housekeeping";

const NOW = new Date("2026-09-09T12:00:00.000Z");

test("el corte son 7 días antes de ahora", () => {
  assert.equal(LOST_AFTER_DAYS, 7);
  assert.equal(lostCutoff(NOW).toISOString(), "2026-09-02T12:00:00.000Z");
  assert.equal(lostCutoff(NOW, 1).toISOString(), "2026-09-08T12:00:00.000Z");
});

test("el cron marca perdidos con el corte de 7 días", async () => {
  const seen: Date[] = [];
  const result = await runLeadsHousekeeping(
    {
      async markLost(cutoff) {
        seen.push(cutoff);
        return 3;
      },
    },
    NOW,
  );

  assert.deepEqual(result, {
    ok: true,
    lost: 3,
    cutoff: "2026-09-02T12:00:00.000Z",
  });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].toISOString(), "2026-09-02T12:00:00.000Z");
});

test("si la base no responde no se pierde nada: se reintenta mañana", async () => {
  const result = await runLeadsHousekeeping(
    {
      async markLost() {
        throw new Error("connection refused");
      },
    },
    NOW,
  );

  assert.equal(result.ok, false);
  assert.equal(result.lost, 0);
  assert.equal(result.reason, "db_error");
});
