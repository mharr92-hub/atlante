/**
 * Salidas del feed (bloque 3.3): qué días se pueden elegir, cuándo hay cupo y
 * cuándo el snapshot deja de valer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  capacityForDate,
  datesWithCapacity,
  datesWithSlots,
  findSlot,
  firstSlotDate,
  nextDatesWithCapacity,
  slotsAreFresh,
  slotsForDate,
  SLOTS_MAX_AGE_MS,
  type SlotOption,
} from "@/lib/slots";

const NOW = new Date("2026-09-09T12:00:00.000Z");

/** El mismo escenario del fixture del feed. */
const SLOTS: SlotOption[] = [
  { id: "s1", date: "2026-09-18", start: "17:30", end: "19:00", capacityRemaining: 18 },
  { id: "s2", date: "2026-09-18", start: "20:00", end: "21:30", capacityRemaining: 2 },
  { id: "s3", date: "2026-09-19", start: "17:30", end: "19:00", capacityRemaining: 0 },
  { id: "s4", date: "2026-09-20", start: "17:30", end: "19:00", capacityRemaining: 40 },
  { id: "s5", date: "2026-09-25", start: "17:30", end: "19:00", capacityRemaining: 12 },
];

test("sin salidas o con snapshot viejo se vuelve a modo puente", () => {
  assert.equal(slotsAreFresh([], NOW, NOW), false);
  assert.equal(slotsAreFresh(SLOTS, null, NOW), false);
  assert.equal(slotsAreFresh(SLOTS, new Date(NOW.getTime() - 60_000), NOW), true);
  assert.equal(
    slotsAreFresh(SLOTS, new Date(NOW.getTime() - SLOTS_MAX_AGE_MS - 1), NOW),
    false,
  );
});

test("los días con salida incluyen los que ya no tienen cupo", () => {
  assert.deepEqual(datesWithSlots(SLOTS), [
    "2026-09-18",
    "2026-09-19",
    "2026-09-20",
    "2026-09-25",
  ]);
});

test("los días con cupo dependen del tamaño del grupo", () => {
  assert.deepEqual(datesWithCapacity(SLOTS, 1), ["2026-09-18", "2026-09-20", "2026-09-25"]);
  assert.deepEqual(datesWithCapacity(SLOTS, 13), ["2026-09-18", "2026-09-20"]);
  assert.deepEqual(datesWithCapacity(SLOTS, 41), []);
});

test("el cupo del día es el de la salida más holgada", () => {
  assert.equal(capacityForDate(SLOTS, "2026-09-18"), 18);
  assert.equal(capacityForDate(SLOTS, "2026-09-19"), 0);
  assert.equal(capacityForDate(SLOTS, "2026-10-01"), 0);
});

test("las salidas de un día salen ordenadas por hora", () => {
  assert.deepEqual(
    slotsForDate(SLOTS, "2026-09-18").map((s) => s.start),
    ["17:30", "20:00"],
  );
});

test("las 3 próximas fechas con cupo excluyen la fecha actual", () => {
  // Con 15 personas el 25 se cae: sólo le quedan 12 cupos.
  assert.deepEqual(nextDatesWithCapacity(SLOTS, "2026-09-18", 15), ["2026-09-20"]);
  assert.deepEqual(nextDatesWithCapacity(SLOTS, "2026-09-18", 10), [
    "2026-09-20",
    "2026-09-25",
  ]);
  assert.deepEqual(nextDatesWithCapacity(SLOTS, "2026-09-01", 1, 3), [
    "2026-09-18",
    "2026-09-20",
    "2026-09-25",
  ]);
  assert.deepEqual(nextDatesWithCapacity(SLOTS, "2026-09-25", 1), []);
});

test("la primera fecha utilizable prefiere una con cupo", () => {
  assert.equal(firstSlotDate(SLOTS, 1), "2026-09-18");
  assert.equal(firstSlotDate(SLOTS, 41), "2026-09-18"); // sin cupo: la primera con salida
  assert.equal(firstSlotDate([], 1), null);
});

test("findSlot resuelve el id que entiende el checkout de PEX", () => {
  assert.equal(findSlot(SLOTS, "s4")?.date, "2026-09-20");
  assert.equal(findSlot(SLOTS, "no-existe"), undefined);
});
