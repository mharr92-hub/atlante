/**
 * Cliente del feed de PEX (bloque 3.1) contra los fixtures.
 *
 * El feed es de otro proyecto: lo que importa es que una entrada rota no
 * contamine el catálogo y que un fallo de red se traduzca en un `reason`
 * legible, nunca en una excepción sin nombre.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  clearFeedCache,
  feedBaseUrl,
  fetchSlots,
  fetchTrips,
  parseSlots,
  parseTrips,
  PexFeedError,
} from "@/lib/pex-feed";

const FIXTURES = path.join(process.cwd(), "tests", "fixtures", "pex-feed");
const BASE = "https://feed.example/api/public";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), "utf8"));
}

const TRIPS = fixture("trips");
const SLOTS = fixture("slots");

/** `fetch` de mentira que sirve los fixtures y cuenta las llamadas. */
function fakeFetch(calls: string[] = []) {
  const impl = (async (url: string | URL) => {
    const href = String(url);
    calls.push(href);
    if (href.includes("/trips")) return Response.json(TRIPS);
    if (href.includes("/slots")) {
      const tripId = new URL(href).searchParams.get("trip_id");
      const rows = (SLOTS as { trip_id: string }[]).filter(
        (slot) => !tripId || slot.trip_id === tripId,
      );
      return Response.json(rows);
    }
    return new Response("no", { status: 404 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

test("parseTrips descarta las entradas que rompen el contrato", () => {
  const trips = parseTrips(TRIPS);
  // El fixture trae 5: una sin `id` y una con `kind` fuera del contrato se caen.
  assert.equal(trips.length, 3);
  assert.deepEqual(
    trips.map((t) => t.slug),
    ["tour-bahia", "party-bahia", "ferry-taboga"],
  );
  assert.equal(trips[2].available, false);
  assert.equal(trips[0].price_table[0].price, 25);
});

test("parseSlots descarta fecha inválida y cupo no numérico", () => {
  const slots = parseSlots(SLOTS);
  assert.equal(slots.length, 5);
  assert.ok(slots.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date)));
  assert.deepEqual(
    slots.map((s) => s.capacity_remaining),
    [18, 2, 0, 40, 12],
  );
});

test("una lista que no es lista es un payload inválido", () => {
  assert.throws(() => parseTrips({ trips: [] }), (error) => {
    assert.ok(error instanceof PexFeedError);
    assert.equal(error.reason, "bad_payload");
    return true;
  });
});

test("sin PEX_FEED_URL el cliente no llama a nadie", async () => {
  clearFeedCache();
  assert.equal(feedBaseUrl(""), null);
  await assert.rejects(fetchTrips({ fetchImpl: fakeFetch().impl }), (error) => {
    assert.ok(error instanceof PexFeedError);
    assert.equal(error.reason, "feed_not_configured");
    return true;
  });
});

test("fetchTrips normaliza la base y devuelve los trips válidos", async () => {
  clearFeedCache();
  const { impl, calls } = fakeFetch();
  const trips = await fetchTrips({ baseUrl: `${BASE}/`, fetchImpl: impl, noCache: true });
  assert.equal(trips.length, 3);
  assert.deepEqual(calls, [`${BASE}/trips`]);
});

test("fetchSlots arma trip_id, from y to", async () => {
  clearFeedCache();
  const { impl, calls } = fakeFetch();
  const slots = await fetchSlots(
    { tripId: "c0d1a003-0000-4000-8000-000000000084", from: "2026-09-09", to: "2026-12-08" },
    { baseUrl: BASE, fetchImpl: impl, noCache: true },
  );
  assert.equal(slots.length, 5);
  assert.equal(
    calls[0],
    `${BASE}/slots?trip_id=c0d1a003-0000-4000-8000-000000000084&from=2026-09-09&to=2026-12-08`,
  );
});

test("la caché en memoria evita la segunda llamada; noCache la fuerza", async () => {
  clearFeedCache();
  const { impl, calls } = fakeFetch();
  await fetchTrips({ baseUrl: BASE, fetchImpl: impl });
  await fetchTrips({ baseUrl: BASE, fetchImpl: impl });
  assert.equal(calls.length, 1);

  await fetchTrips({ baseUrl: BASE, fetchImpl: impl, noCache: true });
  assert.equal(calls.length, 2);
});

test("un 500 del feed se reporta como http_500", async () => {
  clearFeedCache();
  const impl = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
  await assert.rejects(fetchTrips({ baseUrl: BASE, fetchImpl: impl, noCache: true }), (error) => {
    assert.ok(error instanceof PexFeedError);
    assert.equal(error.reason, "http_500");
    return true;
  });
});

test("un cuerpo que no es JSON se reporta como bad_json", async () => {
  clearFeedCache();
  const impl = (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch;
  await assert.rejects(fetchTrips({ baseUrl: BASE, fetchImpl: impl, noCache: true }), (error) => {
    assert.ok(error instanceof PexFeedError);
    assert.equal(error.reason, "bad_json");
    return true;
  });
});

test("el aborto por timeout se reporta como timeout", async () => {
  clearFeedCache();
  const impl = (async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  }) as unknown as typeof fetch;
  await assert.rejects(fetchTrips({ baseUrl: BASE, fetchImpl: impl, noCache: true }), (error) => {
    assert.ok(error instanceof PexFeedError);
    assert.equal(error.reason, "timeout");
    return true;
  });
});
