/**
 * Marketplace de charters (bloque 4.4).
 *
 * Lo que se prueba aquí es lo que decide el precio que ve el cliente y la
 * comisión de Atlante: el tramo de capacidad que cubre a su grupo, los filtros
 * del listado y que TODA salida de "Reserva directa" lleva `ref=ATLANTE`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { getVesselFromCode, operators, vessels, type Operator } from "@/content/vessels";
import { vesselDestination } from "@/lib/destination";
import {
  cheapestRow,
  DEFAULT_PEOPLE,
  durationsOf,
  facets,
  filterVessels,
  matchingRows,
  operatorSealVisible,
  pricePerPerson,
  routesOf,
  rowForGroup,
  sortByPricePerPerson,
} from "@/lib/vessel-pricing";
import {
  formatOnRequestItems,
  formatPricingRows,
  formatRoutes,
  parseOnRequestItems,
  parsePricingRows,
  parseRoutes,
} from "@/lib/vessel-forms";

const aura = getVesselFromCode("aura")!;
const pacificFerry = getVesselFromCode("pacific-ferry-1")!;
const sirena = getVesselFromCode("sirena-del-mar")!;

// ------------------------------------------------- precio por persona ------

test("Aura · 15 pax · Bahía · 4 h = $1,300 / 15 = $86.67", () => {
  const row = rowForGroup(aura, { people: 15, hours: 4, route: "bahia" });
  assert.equal(row?.price, 1300);
  assert.equal(pricePerPerson(aura, { people: 15, hours: 4, route: "bahia" }), 86.67);
});

test("Sirena del Mar · 80 pax · Las Perlas = $5,380 / 80 = $67.25", () => {
  const row = rowForGroup(sirena, { people: 80, route: "perlas" });
  assert.equal(row?.price, 5380);
  assert.equal(row?.hours, 12);
  assert.equal(pricePerPerson(sirena, { people: 80, route: "perlas" }), 67.25);
});

test("manda el tramo que cubre al grupo, no el más barato de la ruta", () => {
  // 20 personas no caben en el tramo de hasta 15: el precio sube a $1,950.
  const row = rowForGroup(sirena, { people: 20, hours: 4, route: "bahia" });
  assert.equal(row?.capacityMax, 35);
  assert.equal(row?.price, 1950);
  assert.equal(pricePerPerson(sirena, { people: 20, hours: 4, route: "bahia" }), 97.5);
});

test("sin tramo publicado que cubra al grupo no se inventa un precio", () => {
  // PEX publica la capacidad del Aura (35) pero no el precio de ese tramo.
  assert.equal(rowForGroup(aura, { people: 35 }), null);
  assert.equal(pricePerPerson(aura, { people: 35 }), null);
  // Un grupo sin definir tampoco produce precio por persona.
  assert.equal(pricePerPerson(aura, { people: 0 }), null);
});

test("el tramo más barato de cada nave es el de $1,300 · 4 h · hasta 15 pax", () => {
  for (const vessel of vessels) {
    const tier = cheapestRow(vessel);
    assert.equal(tier?.price, 1300, vessel.slug);
    assert.equal(tier?.hours, 4, vessel.slug);
    assert.equal(tier?.capacityMax, 15, vessel.slug);
  }
});

test("con el grupo por defecto (15) las tres naves cuestan lo mismo por persona", () => {
  for (const vessel of vessels) {
    assert.equal(pricePerPerson(vessel, { people: DEFAULT_PEOPLE }), 86.67, vessel.slug);
  }
});

test("las jornadas y las rutas salen de la tabla de precios publicada", () => {
  assert.deepEqual(durationsOf(aura), [4, 8]);
  assert.deepEqual(durationsOf(pacificFerry), [4, 8, 12]);
  assert.deepEqual(routesOf(sirena), ["bahia", "taboga", "perlas"]);
});

// ------------------------------------------------------------- filtros -----

test("capacidad mínima descarta las naves que no llegan", () => {
  const shown = filterVessels(vessels, { minCapacity: 40 });
  assert.deepEqual(
    shown.map((v) => v.slug),
    ["sirena-del-mar"],
  );
});

test("presupuesto máximo por barco mira los tramos publicados", () => {
  // Ninguna nave tiene un tramo por debajo de $1,300.
  assert.equal(filterVessels(vessels, { maxBudget: 1200 }).length, 0);
  assert.equal(filterVessels(vessels, { maxBudget: 1300 }).length, 3);
  // A 12 h sólo hay precios del Pacific Ferry 1 y del Sirena, desde $3,000.
  assert.deepEqual(
    filterVessels(vessels, { hours: 12, maxBudget: 3000 }).map((v) => v.slug),
    ["pacific-ferry-1", "sirena-del-mar"],
  );
});

test("la jornada de 12 h deja fuera al Aura, que no la publica", () => {
  assert.deepEqual(
    filterVessels(vessels, { hours: 12 }).map((v) => v.slug),
    ["pacific-ferry-1", "sirena-del-mar"],
  );
});

test("ruta, tipo y marina filtran por el dato publicado", () => {
  assert.equal(filterVessels(vessels, { route: "bahia" }).length, 3);
  assert.deepEqual(
    filterVessels(vessels, { type: "catamaran" }).map((v) => v.slug),
    ["aura"],
  );
  assert.equal(filterVessels(vessels, { marina: "Marina Flamenco, Amador" }).length, 3);
  assert.equal(filterVessels(vessels, { marina: "Otra marina" }).length, 0);
});

test("una nave inactiva no se lista nunca", () => {
  const hidden = [{ ...aura, active: false }, pacificFerry];
  assert.deepEqual(
    filterVessels(hidden).map((v) => v.slug),
    ["pacific-ferry-1"],
  );
});

test("los selectores se arman con los valores presentes", () => {
  const { types, marinas } = facets(vessels);
  assert.deepEqual(types, ["catamaran", "ferry", "no_publicado"]);
  assert.deepEqual(marinas, ["Marina Flamenco, Amador"]);
});

test("el orden es por precio por persona y las naves sin precio van al final", () => {
  // 35 personas: sólo el Sirena publica un tramo que las cubre ($1,950).
  const sorted = sortByPricePerPerson(vessels, { people: 35 });
  assert.deepEqual(
    sorted.map((v) => v.slug),
    ["sirena-del-mar", "aura", "pacific-ferry-1"],
  );
  assert.equal(pricePerPerson(sorted[0], { people: 35 }), 55.71);
  assert.equal(pricePerPerson(sorted[1], { people: 35 }), null);

  // A igualdad de precio por persona manda el orden del marketplace.
  const empate = sortByPricePerPerson(vessels, { people: 30, hours: 8 });
  assert.deepEqual(
    empate.map((v) => v.slug),
    ["aura", "pacific-ferry-1", "sirena-del-mar"],
  );
  assert.equal(pricePerPerson(empate[0], { people: 30, hours: 8 }), 75);
});

test("matchingRows sin filtros devuelve toda la tabla", () => {
  assert.equal(matchingRows(sirena).length, sirena.pricing.length);
});

// -------------------------------------------------- salida a PEX -----------

test("toda URL de Reserva directa lleva ref=ATLANTE y ningún dato personal", () => {
  const directos = vessels.filter((v) => v.closeMode === "deeplink");
  assert.equal(directos.length, 3);

  for (const vessel of directos) {
    const url = new URL(
      vesselDestination(vessel, { leadId: "ld_1", handoffToken: "a".repeat(64) }),
    );
    assert.equal(url.pathname, "/charter/checkout", vessel.slug);
    assert.equal(url.searchParams.get("vessel"), vessel.pexVesselSlug, vessel.slug);
    assert.equal(url.searchParams.get("ref"), "ATLANTE", vessel.slug);
    assert.equal(url.searchParams.get("ref_id"), "ld_1", vessel.slug);
    assert.equal(url.searchParams.get("h"), "a".repeat(64), vessel.slug);
    assert.equal(url.searchParams.get("utm_source"), "atlante", vessel.slug);
    assert.equal(url.searchParams.get("utm_campaign"), vessel.slug, vessel.slug);

    for (const forbidden of ["name", "email", "phone", "nombre", "correo", "telefono"]) {
      assert.equal(url.searchParams.get(forbidden), null, `${vessel.slug}/${forbidden}`);
    }
  }
});

test("sin lead la URL sigue llevando el código de Atlante", () => {
  const url = new URL(vesselDestination(aura));
  assert.equal(url.searchParams.get("ref"), "ATLANTE");
  assert.equal(url.searchParams.get("ref_id"), null);
});

test("una nave sin slug de checkout no pierde el ref: cae a su ficha", () => {
  const url = new URL(vesselDestination({ ...aura, pexVesselSlug: undefined }));
  assert.equal(url.pathname, "/charter/aura");
  assert.equal(url.searchParams.get("ref"), "ATLANTE");
});

// ----------------------------------------------- sello del operador --------

const FULL: Operator = {
  slug: "aliado",
  name: "Aliado",
  contractSignedAt: "2026-01-15",
  ampLicense: "AMP-123",
  insuranceUntil: "2027-01-01",
  verified: true,
  active: true,
};

test("el sello exige los tres del checklist y la casilla del admin", () => {
  const now = new Date("2026-09-09T12:00:00.000Z");
  assert.equal(operatorSealVisible(FULL, now), true);
  assert.equal(operatorSealVisible({ ...FULL, verified: false }, now), false);
  assert.equal(operatorSealVisible({ ...FULL, ampLicense: undefined }, now), false);
  assert.equal(operatorSealVisible({ ...FULL, contractSignedAt: undefined }, now), false);
  assert.equal(operatorSealVisible({ ...FULL, insuranceUntil: "2026-08-01" }, now), false);
  assert.equal(operatorSealVisible({ ...FULL, active: false }, now), false);
  assert.equal(operatorSealVisible(null, now), false);
});

test("hoy ningún operador muestra el sello: PEX no tiene el checklist cargado", () => {
  for (const operator of operators) {
    assert.equal(operatorSealVisible(operator), false, operator.slug);
  }
});

// ------------------------------------------- formularios del admin ---------

test("la tabla de precios va y vuelve del formulario sin perder nada", () => {
  const text = formatPricingRows(sirena.pricing);
  assert.deepEqual(parsePricingRows(text), sirena.pricing);
});

test("una fila de precios incompleta se descarta en vez de guardarse a medias", () => {
  const rows = parsePricingRows(
    ["bahia | 4 | 15 | 1300", "taboga | 8 |  | 1700", "sin-precio | 4 | 10 |", "  "].join("\n"),
  );
  assert.deepEqual(rows, [{ route: "bahia", hours: 4, capacityMax: 15, price: 1300 }]);
});

test("las rutas se normalizan y no se repiten", () => {
  assert.deepEqual(parseRoutes("Bahía, taboga, BAHIA,, perlas"), ["bahia", "taboga", "perlas"]);
  assert.equal(formatRoutes(["bahia", "taboga"]), "bahia, taboga");
});

test("los extras bajo solicitud conservan precio y unidad, y admiten no tenerlos", () => {
  const parsed = parseOnRequestItems(formatOnRequestItems(aura.onRequest));
  assert.deepEqual(parsed, aura.onRequest);

  const sinPrecio = parseOnRequestItems("Snorkel | Snorkeling");
  assert.deepEqual(sinPrecio, [{ label: { es: "Snorkel", en: "Snorkeling" } }]);

  const unidadInvalida = parseOnRequestItems("BBQ | BBQ | 20 | por_persona");
  assert.deepEqual(unidadInvalida, [{ label: { es: "BBQ", en: "BBQ" }, price: 20 }]);
});

// ------------------------------------------------- datos del bloque 2 ------

test("las tres naves de PEX están cargadas con su fuente y su fecha", () => {
  assert.deepEqual(
    vessels.map((v) => v.slug),
    ["aura", "pacific-ferry-1", "sirena-del-mar"],
  );
  for (const vessel of vessels) {
    assert.equal(vessel.operatorSlug, "pex", vessel.slug);
    assert.equal(vessel.verifiedAt, "2026-09-09", vessel.slug);
    assert.equal(vessel.depositPct, 30, vessel.slug);
    assert.equal(vessel.marina, "Marina Flamenco, Amador", vessel.slug);
    assert.ok(vessel.sourceUrl, vessel.slug);
    assert.ok(vessel.pricing.length > 0, vessel.slug);
  }
  assert.deepEqual(
    vessels.map((v) => v.capacityMax),
    [35, 30, 80],
  );
});
