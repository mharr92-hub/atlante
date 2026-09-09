/**
 * Formularios de `/admin/catalogo` (bloque 3.5).
 *
 * Un horario o una tabla de precios mal parseada rompe el funnel entero, así que
 * el parseo se prueba aparte de la página.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatLocalizedLines,
  formatPriceTable,
  formatTimes,
  localized,
  parseImages,
  parseIntOrNull,
  parseISODate,
  parseLocalizedLines,
  parseNumber,
  parsePriceTable,
  parseSchedule,
  parseTime,
  parseTimes,
  parseWeekdays,
  slugifyKey,
} from "@/lib/catalog-forms";

test("las horas se normalizan a HH:MM y lo demás se descarta", () => {
  assert.equal(parseTime("17:30"), "17:30");
  assert.equal(parseTime(" 7:05 "), "07:05");
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("17:60"), null);
  assert.equal(parseTime("tarde"), null);
});

test("los horarios van y vuelven sin perder nada", () => {
  const times = parseTimes("17:30-19:00, 20:00-21:30");
  assert.deepEqual(times, [
    { start: "17:30", end: "19:00" },
    { start: "20:00", end: "21:30" },
  ]);
  assert.equal(formatTimes(times), "17:30-19:00, 20:00-21:30");
  assert.deepEqual(parseTimes("19:00"), [{ start: "19:00" }]);
  assert.deepEqual(parseTimes(""), []);
  assert.deepEqual(parseTimes("basura, 08:00"), [{ start: "08:00" }]);
});

test("los días de salida se ordenan y se limpian", () => {
  assert.deepEqual(parseWeekdays(["6", "5", "0"]), [0, 5, 6]);
  assert.deepEqual(parseWeekdays(["5", "5"]), [5]);
  assert.deepEqual(parseWeekdays(["7", "-1", "lunes"]), []);
});

test("un producto sin calendario guarda schedule en null", () => {
  assert.equal(
    parseSchedule({ weekdays: [], times: "", validFrom: "", noteEs: "", noteEn: "" }),
    null,
  );
});

test("el horario del tour por la bahía se guarda tal como lo publica PEX", () => {
  const schedule = parseSchedule({
    weekdays: ["5", "6", "0"],
    times: "17:30-19:00, 20:00-21:30",
    validFrom: "2026-09-18",
    noteEs: "Viernes, sábado y domingo.",
    noteEn: "",
  });

  assert.deepEqual(schedule, {
    weekdays: [0, 5, 6],
    times: [
      { start: "17:30", end: "19:00" },
      { start: "20:00", end: "21:30" },
    ],
    validFrom: "2026-09-18",
    // Sin inglés se repite el español: nunca se inventa una traducción.
    note: { es: "Viernes, sábado y domingo.", en: "Viernes, sábado y domingo." },
  });
});

test("una fecha que no es ISO se descarta", () => {
  assert.equal(parseISODate("2026-09-18"), "2026-09-18");
  assert.equal(parseISODate("18/09/2026"), null);
  assert.equal(parseISODate(""), null);
});

test("la tabla de precios va y vuelve por texto", () => {
  const raw = [
    "adulto-nacional | Adulto nacional | National adult | 10",
    "nino-jubilado | Niño y jubilado | Child and senior | 8",
  ].join("\n");

  const rows = parsePriceTable(raw);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    key: "adulto-nacional",
    label: { es: "Adulto nacional", en: "National adult" },
    price: 10,
  });
  assert.equal(formatPriceTable(rows), raw);
});

test("una fila de precios sin número no entra", () => {
  assert.deepEqual(parsePriceTable("persona | Por persona | Per person | consultar"), []);
  assert.deepEqual(parsePriceTable("| | | 25"), []);
});

test("sin key explícita se deriva de la etiqueta", () => {
  const rows = parsePriceTable("Turista (fin de semana) | Turista (fin de semana) | Tourist | 15");
  assert.equal(rows[0].key, "turista-fin-de-semana");
  assert.equal(slugifyKey("Niño y jubilado"), "nino-y-jubilado");
});

test("las listas bilingües se emparejan por línea", () => {
  const list = parseLocalizedLines("Fee de puerto\nParqueo gratis", "Port fee");
  assert.deepEqual(list, [
    { es: "Fee de puerto", en: "Port fee" },
    // La línea sin traducción repite el español.
    { es: "Parqueo gratis", en: "Parqueo gratis" },
  ]);
  assert.equal(formatLocalizedLines(list, "es"), "Fee de puerto\nParqueo gratis");
  assert.deepEqual(parseLocalizedLines("", ""), []);
});

test("localized cae al español cuando falta el inglés", () => {
  assert.deepEqual(localized(" Tour ", ""), { es: "Tour", en: "Tour" });
  assert.deepEqual(localized("Tour", "Bay Tour"), { es: "Tour", en: "Bay Tour" });
});

test("los números vacíos o fuera de rango son null, no cero", () => {
  assert.equal(parseNumber("", 0, 100), null);
  assert.equal(parseNumber("25.5", 0, 100), 25.5);
  assert.equal(parseNumber("101", 0, 100), null);
  assert.equal(parseNumber("-1", 0, 100), null);
  assert.equal(parseIntOrNull("30.7", 0, 100), 30);
  assert.equal(parseIntOrNull("  ", 0, 100), null);
});

test("las imágenes son una ruta por línea, sin vacíos", () => {
  assert.deepEqual(parseImages("/a.jpg\n\n  /b.jpg  \n"), ["/a.jpg", "/b.jpg"]);
});
