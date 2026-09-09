/**
 * El destino del handoff (bloque 3.3): cuándo se hace deep link al checkout de
 * PEX y cuándo se sigue en modo puente.
 *
 * Regla no negociable del PRD (principio 2): las cuatro URLs llevan `ref=ATLANTE`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { getProduct } from "@/content/catalog";
import { pexDestination, tripIdOf } from "@/lib/destination";
import type { SlotOption } from "@/lib/slots";

const tourBahia = getProduct("tour-bahia")!;
const partyBahia = getProduct("party-bahia")!;
const aura = getProduct("charter-aura")!;

const SLOT: SlotOption = {
  id: "slot-2026-09-18-1730",
  date: "2026-09-18",
  start: "17:30",
  end: "19:00",
  capacityRemaining: 18,
};

test("modo puente: sin salida se enlaza la página del producto", () => {
  const url = new URL(pexDestination(tourBahia, { addons: [], leadId: "ld_1" }));
  assert.equal(url.pathname, "/ferry/bahia");
  assert.equal(url.searchParams.get("ref"), "ATLANTE");
  assert.equal(url.searchParams.get("ref_id"), "ld_1");
  assert.equal(url.searchParams.get("slot_id"), null);
});

test("modo integrado: con salida y trip_id se hace deep link al checkout", () => {
  const url = new URL(
    pexDestination(partyBahia, {
      addons: [],
      leadId: "ld_2",
      handoffToken: "a".repeat(64),
      slot: SLOT,
      tickets: 30,
    }),
  );

  assert.equal(url.pathname, "/tours/checkout");
  assert.equal(url.searchParams.get("trip_id"), "c0d1a003-0000-4000-8000-000000000085");
  assert.equal(url.searchParams.get("slot_id"), "slot-2026-09-18-1730");
  assert.equal(url.searchParams.get("date"), "2026-09-18");
  assert.equal(url.searchParams.get("tickets"), "30");
  assert.equal(url.searchParams.get("ref"), "ATLANTE");
  assert.equal(url.searchParams.get("ref_id"), "ld_2");
  assert.equal(url.searchParams.get("h"), "a".repeat(64));
  assert.equal(url.searchParams.get("utm_campaign"), "party-bahia");
});

test("con salida pero sin trip_id no hay deep link: se degrada a la página", () => {
  // El `trip_id` del Tour por la Bahía sigue PENDIENTE MARK: es `null`.
  assert.equal(tripIdOf(tourBahia), null);
  const url = new URL(pexDestination(tourBahia, { slot: SLOT, tickets: 2 }));
  assert.equal(url.pathname, "/ferry/bahia");
  assert.equal(url.searchParams.get("slot_id"), null);
  assert.equal(url.searchParams.get("ref"), "ATLANTE");
});

test("una nave siempre va a su checkout, aunque llegue una salida", () => {
  const url = new URL(pexDestination(aura, { slot: SLOT, tickets: 10, leadId: "ld_3" }));
  assert.equal(url.pathname, "/charter/checkout");
  assert.equal(url.searchParams.get("vessel"), "aura");
  assert.equal(url.searchParams.get("slot_id"), null);
  assert.equal(url.searchParams.get("ref"), "ATLANTE");
});

test("los adicionales viajan uno por parámetro y nunca hay datos personales", () => {
  const url = new URL(
    pexDestination(aura, { addons: ["bbq", "open-bar"], leadId: "ld_4" }),
  );
  assert.deepEqual(url.searchParams.getAll("addon"), ["bbq", "open-bar"]);
  for (const forbidden of ["name", "email", "phone", "nombre", "correo", "telefono"]) {
    assert.equal(url.searchParams.get(forbidden), null, forbidden);
  }
});

test("sin lead la URL igual lleva el código de Atlante", () => {
  for (const product of [tourBahia, partyBahia, aura]) {
    const url = new URL(pexDestination(product));
    assert.equal(url.searchParams.get("ref"), "ATLANTE", product.slug);
    assert.equal(url.searchParams.get("ref_id"), null, product.slug);
    assert.equal(url.searchParams.get("utm_source"), "atlante", product.slug);
  }
});
