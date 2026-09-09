/**
 * Guardarraíl de atribución: ninguna salida a PEX puede perder `ref=ATLANTE`
 * ni llevar datos personales. Se corre con `npm run test`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPexUrl, ATLANTE_REF, type PexTarget } from "../src/lib/pex";

const TARGETS: Array<{ target: PexTarget; extra?: Record<string, unknown> }> = [
  { target: "home" },
  { target: "path", extra: { path: "/politicas" } },
  { target: "tour_page", extra: { path: "/ferry/bahia" } },
  { target: "tour_checkout", extra: { tripId: "trip-123" } },
  { target: "charter_page", extra: { path: "/charter/aura" } },
  { target: "charter_checkout", extra: { vessel: "aura" } },
];

test("todos los targets llevan ref=ATLANTE y el juego de UTM", () => {
  for (const { target, extra } of TARGETS) {
    const url = new URL(buildPexUrl({ target, ...extra }));
    assert.equal(url.searchParams.get("ref"), ATLANTE_REF, target);
    assert.equal(url.searchParams.get("utm_source"), "atlante", target);
    assert.equal(url.searchParams.get("utm_medium"), "referral", target);
    assert.equal(url.searchParams.get("utm_campaign"), "site", target);
  }
});

test("ref_id sólo aparece cuando hay lead", () => {
  const sinLead = new URL(buildPexUrl({ target: "tour_page", path: "/ferry/bahia" }));
  assert.equal(sinLead.searchParams.get("ref_id"), null);

  const conLead = new URL(
    buildPexUrl({ target: "tour_page", path: "/ferry/bahia", leadId: "ld_123" }),
  );
  assert.equal(conLead.searchParams.get("ref_id"), "ld_123");
});

test("h sólo aparece cuando hay token de handoff", () => {
  const sinToken = new URL(buildPexUrl({ target: "tour_page", path: "/ferry/bahia" }));
  assert.equal(sinToken.searchParams.get("h"), null);

  const conToken = new URL(
    buildPexUrl({ target: "tour_page", path: "/ferry/bahia", handoffToken: "abc123" }),
  );
  assert.equal(conToken.searchParams.get("h"), "abc123");
});

test("tour_checkout sin tripId cae a la página del producto", () => {
  const url = new URL(
    buildPexUrl({
      target: "tour_checkout",
      path: "/ferry/bahia",
      tripId: null,
      date: "2026-09-18",
      tickets: 2,
    }),
  );
  assert.equal(url.pathname, "/ferry/bahia");
  assert.equal(url.searchParams.get("trip_id"), null);
  assert.equal(url.searchParams.get("tickets"), null);
  assert.equal(url.searchParams.get("ref"), ATLANTE_REF);
});

test("tour_checkout con tripId arma el deep link completo", () => {
  const url = new URL(
    buildPexUrl({
      target: "tour_checkout",
      tripId: "trip-123",
      slotId: "slot-9",
      date: "2026-09-18",
      tickets: 2,
      campaign: "tour-bahia",
    }),
  );
  assert.equal(url.pathname, "/tours/checkout");
  assert.equal(url.searchParams.get("trip_id"), "trip-123");
  assert.equal(url.searchParams.get("slot_id"), "slot-9");
  assert.equal(url.searchParams.get("date"), "2026-09-18");
  assert.equal(url.searchParams.get("tickets"), "2");
  assert.equal(url.searchParams.get("utm_campaign"), "tour-bahia");
});

test("charter_checkout lleva la nave", () => {
  const url = new URL(buildPexUrl({ target: "charter_checkout", vessel: "sirena-del-mar" }));
  assert.equal(url.pathname, "/charter/checkout");
  assert.equal(url.searchParams.get("vessel"), "sirena-del-mar");
});

test("los add-ons se repiten, uno por parámetro", () => {
  const url = new URL(
    buildPexUrl({
      target: "tour_page",
      path: "/ferry/contadora",
      addons: ["tour-islas", "bbq"],
    }),
  );
  assert.deepEqual(url.searchParams.getAll("addon"), ["tour-islas", "bbq"]);
});

test("nunca viajan nombre, correo ni teléfono", () => {
  const url = buildPexUrl({
    target: "tour_checkout",
    tripId: "trip-123",
    date: "2026-09-18",
    tickets: 3,
    leadId: "ld_123",
    handoffToken: "tok_456",
    addons: ["bbq"],
    campaign: "tour-bahia",
  });
  const allowed = new Set([
    "trip_id", "slot_id", "date", "tickets", "vessel",
    "ref", "utm_source", "utm_medium", "utm_campaign", "ref_id", "h", "addon",
  ]);
  for (const key of new URL(url).searchParams.keys()) {
    assert.ok(allowed.has(key), `parámetro no permitido en la URL de PEX: ${key}`);
  }
  for (const forbidden of ["name", "email", "phone", "nombre", "correo", "telefono"]) {
    assert.ok(!url.includes(`${forbidden}=`), `la URL no puede llevar ${forbidden}`);
  }
});

test("la URL del modo puente del tour por la bahía es la esperada", () => {
  assert.equal(
    buildPexUrl({ target: "tour_page", path: "/ferry/bahia", campaign: "tour-bahia" }),
    "https://www.pacificexperience.lat/ferry/bahia?ref=ATLANTE&utm_source=atlante&utm_medium=referral&utm_campaign=tour-bahia",
  );
});
