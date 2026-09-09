/**
 * Sincronización feed → base de datos (bloque 3.2), con un doble de `SyncDb`.
 *
 * Lo que se prueba de verdad es la regla del bloque: si el feed falla, el
 * snapshot anterior queda intacto. Por eso los casos importantes son los de
 * error, no el camino feliz.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { clearFeedCache } from "@/lib/pex-feed";
import {
  priceUnitFor,
  slugifyLabel,
  syncPex,
  syncWindow,
  tripToCreateFields,
  tripToFeedFields,
  utcISODate,
  type ProductCreateFields,
  type ProductFeedFields,
  type SlotFields,
  type SyncDb,
} from "@/lib/sync-pex";

const FIXTURES = path.join(process.cwd(), "tests", "fixtures", "pex-feed");
const BASE = "https://feed.example/api/public";
const TOUR_TRIP_ID = "c0d1a003-0000-4000-8000-000000000084";
const NOW = new Date("2026-09-09T12:00:00.000Z");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), "utf8"));
}

const TRIPS = fixture("trips");
const SLOTS = fixture("slots") as { trip_id: string }[];

interface Recorder {
  db: SyncDb;
  created: ProductCreateFields[];
  updated: { id: string; data: ProductFeedFields }[];
  slots: SlotFields[];
  deleted: { productId: string; keep: string[] }[];
}

/** Doble de `SyncDb`: sólo apunta lo que se le pidió escribir. */
function recorder(existing: Record<string, string> = {}): Recorder {
  const created: ProductCreateFields[] = [];
  const updated: { id: string; data: ProductFeedFields }[] = [];
  const slots: SlotFields[] = [];
  const deleted: { productId: string; keep: string[] }[] = [];

  const db: SyncDb = {
    async findProduct(tripId, slug) {
      const id = existing[tripId] ?? existing[slug];
      return id ? { id, slug } : null;
    },
    async createProduct(data) {
      created.push(data);
      return { id: `new-${data.slug}`, slug: data.slug };
    },
    async updateProduct(id, data) {
      updated.push({ id, data });
    },
    async upsertSlot(data) {
      slots.push(data);
    },
    async deleteStaleSlots(productId, _from, _to, keep) {
      deleted.push({ productId, keep });
      return 0;
    },
  };

  return { db, created, updated, slots, deleted };
}

/** `fetch` de mentira con control de qué endpoint falla. */
function feed(options: { failTrips?: boolean; failSlotsFor?: string[] } = {}) {
  const impl = (async (url: string | URL) => {
    const href = String(url);
    if (href.includes("/trips")) {
      if (options.failTrips) return new Response("nope", { status: 502 });
      return Response.json(TRIPS);
    }
    const tripId = new URL(href).searchParams.get("trip_id") ?? "";
    if (options.failSlotsFor?.includes(tripId)) return new Response("nope", { status: 500 });
    return Response.json(SLOTS.filter((slot) => slot.trip_id === tripId));
  }) as unknown as typeof fetch;
  return impl;
}

test("la ventana de sincronización son 90 días desde hoy", () => {
  assert.deepEqual(syncWindow(NOW), { from: "2026-09-09", to: "2026-12-08" });
  assert.equal(utcISODate(NOW), "2026-09-09");
});

test("las etiquetas del feed se convierten en keys estables", () => {
  assert.equal(slugifyLabel("Adulto nacional", 0), "adulto-nacional");
  assert.equal(slugifyLabel("Niño y jubilado", 1), "nino-y-jubilado");
  assert.equal(slugifyLabel("   ", 2), "categoria-3");
});

test("el ferry se cobra por tramo y el resto por persona", () => {
  assert.equal(priceUnitFor("ferry"), "per_segment");
  assert.equal(priceUnitFor("tour"), "per_person");
  assert.equal(priceUnitFor("party"), "per_person");
});

test("un trip del feed se mapea sin inventar traducciones", () => {
  const trip = {
    id: TOUR_TRIP_ID,
    slug: "tour-bahia",
    kind: "tour" as const,
    name: "Tour por la Bahía",
    price_from: 25,
    price_table: [{ label: "Por persona", price: 25 }],
    duration_min: 90,
    capacity_min: 1,
    capacity_max: 60,
    policies: ["Pago en línea del 100 % al reservar."],
    images: ["/tours/bahia-1.jpg"],
    path: "/ferry/bahia",
    available: true,
  };

  const feedFields = tripToFeedFields(trip, NOW);
  assert.equal(feedFields.pexTripId, TOUR_TRIP_ID);
  assert.equal(feedFields.priceFrom, 25);
  assert.deepEqual(feedFields.priceTable[0], {
    key: "por-persona",
    label: { es: "Por persona", en: "Por persona" },
    price: 25,
  });
  assert.equal(feedFields.verifiedAt.toISOString(), "2026-09-09T00:00:00.000Z");

  const createFields = tripToCreateFields(trip, NOW);
  assert.equal(createFields.priceUnit, "per_person");
  // El feed es monolingüe: el mismo texto en los dos idiomas, nunca una
  // traducción inventada.
  assert.deepEqual(createFields.name, { es: "Tour por la Bahía", en: "Tour por la Bahía" });
  assert.equal(createFields.sourceUrl, null);
});

test("corrida completa: crea los productos válidos y copia sus salidas", async () => {
  clearFeedCache();
  const rec = recorder();
  const result = await syncPex({
    db: rec.db,
    baseUrl: BASE,
    fetchImpl: feed(),
    now: NOW,
  });

  assert.equal(result.ok, true);
  // Las dos entradas rotas del fixture no llegan a la base.
  assert.equal(result.trips, 3);
  assert.equal(result.products, 3);
  assert.equal(rec.created.length, 3);
  assert.equal(rec.updated.length, 0);

  // Sólo el tour tiene salidas en el fixture.
  assert.equal(result.slots, 5);
  assert.equal(rec.slots.length, 5);
  assert.equal(rec.slots[0].productId, "new-tour-bahia");
  assert.equal(rec.slots[0].date, "2026-09-18");
  assert.equal(rec.slots[0].capacityRemaining, 18);
  assert.deepEqual(result.slotErrors, []);

  // Cada producto pide limpiar lo que el feed ya no trae.
  assert.equal(rec.deleted.length, 3);
  assert.equal(rec.deleted[0].keep.length, 5);
});

test("un producto que ya existe se actualiza, no se duplica", async () => {
  clearFeedCache();
  const rec = recorder({ [TOUR_TRIP_ID]: "prod_1" });
  const result = await syncPex({ db: rec.db, baseUrl: BASE, fetchImpl: feed(), now: NOW });

  assert.equal(result.ok, true);
  assert.equal(rec.updated.length, 1);
  assert.equal(rec.updated[0].id, "prod_1");
  assert.equal(rec.created.length, 2);
  assert.equal(rec.slots[0].productId, "prod_1");
});

test("si /trips falla no se escribe nada: manda el snapshot anterior", async () => {
  clearFeedCache();
  const rec = recorder();
  const result = await syncPex({
    db: rec.db,
    baseUrl: BASE,
    fetchImpl: feed({ failTrips: true }),
    now: NOW,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "http_502");
  assert.equal(result.products, 0);
  assert.equal(rec.created.length, 0);
  assert.equal(rec.updated.length, 0);
  assert.equal(rec.slots.length, 0);
  assert.equal(rec.deleted.length, 0);
});

test("si falla el /slots de un producto, sus salidas no se borran", async () => {
  clearFeedCache();
  const rec = recorder();
  const result = await syncPex({
    db: rec.db,
    baseUrl: BASE,
    fetchImpl: feed({ failSlotsFor: [TOUR_TRIP_ID] }),
    now: NOW,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.slotErrors, ["tour-bahia"]);
  assert.equal(result.slots, 0);
  // El producto sí se actualizó, pero nadie tocó sus salidas.
  assert.equal(rec.created.length, 3);
  assert.ok(rec.deleted.every((d) => d.productId !== "new-tour-bahia"));
});
