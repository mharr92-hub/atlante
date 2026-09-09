/**
 * Reporte de comisiones (bloque 3.4): agrupado por producto y por mes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { monthBounds, recentMonths, summarizeCommissions } from "@/lib/commissions";

const NOW = new Date("2026-09-09T12:00:00.000Z");

test("monthBounds abre y cierra el mes en UTC", () => {
  const range = monthBounds("2026-09", NOW);
  assert.equal(range.month, "2026-09");
  assert.equal(range.from.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("diciembre cierra en enero del año siguiente", () => {
  const range = monthBounds("2026-12", NOW);
  assert.equal(range.to.toISOString(), "2027-01-01T00:00:00.000Z");
});

test("un mes inválido cae al mes actual", () => {
  for (const bad of [undefined, "", "2026-13", "septiembre", "2026-9"]) {
    assert.equal(monthBounds(bad, NOW).month, "2026-09", String(bad));
  }
});

test("recentMonths va del mes actual hacia atrás", () => {
  const months = recentMonths(4, NOW);
  assert.deepEqual(months, ["2026-09", "2026-08", "2026-07", "2026-06"]);
});

test("los leads pagados se agrupan por producto y se ordenan por comisión", () => {
  const { rows, total } = summarizeCommissions(
    [
      { productSlug: "tour-bahia", vesselSlug: null, amount: 50, commissionAmount: 10 },
      { productSlug: "tour-bahia", vesselSlug: null, amount: 25, commissionAmount: 5 },
      { productSlug: null, vesselSlug: "charter-aura", amount: 1300, commissionAmount: 260 },
    ],
    (slug) => (slug === "tour-bahia" ? "Tour por la Bahía" : "Chárter Aura"),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].slug, "charter-aura");
  assert.equal(rows[0].label, "Chárter Aura");
  assert.equal(rows[0].leads, 1);
  assert.equal(rows[0].commission, 260);
  assert.equal(rows[0].effectivePct, 20);

  assert.equal(rows[1].slug, "tour-bahia");
  assert.equal(rows[1].leads, 2);
  assert.equal(rows[1].amount, 75);
  assert.equal(rows[1].commission, 15);
  assert.equal(rows[1].effectivePct, 20);

  assert.equal(total.leads, 3);
  assert.equal(total.amount, 1375);
  assert.equal(total.commission, 275);
  assert.equal(total.effectivePct, 20);
});

test("el porcentaje mostrado es el efectivo, no el configurado", () => {
  const { rows } = summarizeCommissions([
    { productSlug: "party-bahia", vesselSlug: null, amount: 1050, commissionAmount: 105 },
  ]);
  assert.equal(rows[0].effectivePct, 10);
});

test("un lead pagado sin monto no inventa porcentaje", () => {
  const { rows, total } = summarizeCommissions([
    { productSlug: "tour-bahia", vesselSlug: null, amount: 0, commissionAmount: 0 },
  ]);
  assert.equal(rows[0].effectivePct, null);
  assert.equal(total.effectivePct, null);
});

test("un lead sin producto ni nave se agrupa aparte", () => {
  const { rows } = summarizeCommissions([
    { productSlug: null, vesselSlug: null, amount: 80, commissionAmount: 16 },
  ]);
  assert.equal(rows[0].slug, "(sin producto)");
  assert.equal(rows[0].label, "(sin producto)");
});

test("sin leads pagados el total es cero y no hay filas", () => {
  const { rows, total } = summarizeCommissions([]);
  assert.deepEqual(rows, []);
  assert.equal(total.leads, 0);
  assert.equal(total.amount, 0);
  assert.equal(total.commission, 0);
});
