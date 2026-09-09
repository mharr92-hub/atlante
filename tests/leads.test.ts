/**
 * El total del funnel se recalcula siempre desde el catálogo (el cliente nunca
 * manda precios). Estos casos son los del bloque 2 sobre el catálogo real.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { getProduct, catalog } from "../src/content/catalog";
import {
  computeTotal,
  decodePax,
  encodePax,
  earliestDate,
  firstSelectableDate,
  isSelectableDate,
  paxTotal,
  toISODate,
} from "../src/lib/funnel";

const tourBahia = getProduct("tour-bahia")!;
const ferryTaboga = getProduct("ferry-taboga")!;

test("2 adultos del tour por la bahía suman $50", () => {
  assert.equal(computeTotal(tourBahia, { persona: 2 }), 50);
});

test("ferry: 1 adulto nacional + 1 niño suman $18", () => {
  assert.equal(computeTotal(ferryTaboga, { "adulto-nacional": 1, "nino-jubilado": 1 }), 18);
});

test("las categorías desconocidas no suman", () => {
  assert.equal(computeTotal(tourBahia, { persona: 1, inventada: 9 }), 25);
});

test("los adicionales con unidad por confirmar no suman al estimado", () => {
  const contadora = getProduct("ferry-contadora")!;
  const conAddon = computeTotal(contadora, { "tarifa-registrada": 1 }, ["tour-islas"]);
  assert.equal(conAddon, 130);
});

test("los adicionales por persona multiplican por el total de pasajeros", () => {
  const aura = getProduct("charter-aura")!;
  // 1 × barco completo ($1,300) + BBQ ($20) × 1 pasajero
  assert.equal(computeTotal(aura, { "barco-completo": 1 }, ["bbq"]), 1320);
});

test("pax se codifica y se decodifica sin perder categorías", () => {
  const pax = { "adulto-nacional": 2, "nino-jubilado": 1 };
  assert.equal(encodePax(pax), "adulto-nacional:2,nino-jubilado:1");
  assert.deepEqual(decodePax(encodePax(pax), ferryTaboga), pax);
  assert.equal(paxTotal(pax), 3);
});

test("decodePax descarta categorías que no existen en el producto", () => {
  assert.deepEqual(decodePax("persona:2,inventada:5", tourBahia), { persona: 2 });
});

test("el tour por la bahía sólo admite viernes, sábado y domingo desde el 18/09/2026", () => {
  const hoy = new Date(2026, 8, 8); // 8 de septiembre de 2026
  assert.equal(toISODate(earliestDate(tourBahia, hoy)), "2026-09-18");
  // 2026-09-18 es viernes
  assert.equal(toISODate(firstSelectableDate(tourBahia, hoy)), "2026-09-18");
  assert.equal(isSelectableDate(tourBahia, new Date(2026, 8, 21), hoy), false); // lunes
  assert.equal(isSelectableDate(tourBahia, new Date(2026, 8, 20), hoy), true); // domingo
  assert.equal(isSelectableDate(tourBahia, new Date(2026, 8, 11), hoy), false); // antes del validFrom
});

test("el ferry admite cualquier día a partir de mañana", () => {
  const hoy = new Date(2026, 8, 8);
  assert.equal(isSelectableDate(ferryTaboga, new Date(2026, 8, 8), hoy), false);
  assert.equal(isSelectableDate(ferryTaboga, new Date(2026, 8, 9), hoy), true);
  assert.equal(isSelectableDate(ferryTaboga, new Date(2026, 8, 14), hoy), true);
});

test("cada producto del catálogo declara fuente y fecha de verificación", () => {
  for (const p of catalog) {
    assert.match(p.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, p.slug);
    assert.ok(p.sourceUrl.startsWith("https://"), p.slug);
    assert.ok(p.pexPath.startsWith("/"), p.slug);
  }
});
