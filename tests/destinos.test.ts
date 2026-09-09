/**
 * Páginas de destino (bloque 6.1): qué se lista en cada una y qué nunca se
 * inventa.
 *
 * Lo que se prueba es el cruce y el contenido, no el maquetado: que un destino
 * sólo enseñe productos y naves que existen de verdad en el catálogo, que lo que
 * el operador no está vendiendo no salga con precio, y que el texto del lugar no
 * tenga ni una cifra (regla 3 del bloque).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { catalog, ticketProducts } from "@/content/catalog";
import { destinations, destinationSlugs, getDestination } from "@/content/destinations";
import { vessels } from "@/content/vessels";
import { productsForDestination, vesselsForDestination } from "@/lib/destinations";

const catalogSlugs = new Set(catalog.map((p) => p.slug));

test("los tres destinos del bloque existen y tienen slug único", () => {
  assert.deepEqual(destinationSlugs, ["taboga", "las-perlas", "bahia"]);
  assert.equal(new Set(destinationSlugs).size, 3);
});

test("cada destino trae texto en los dos idiomas y de 2 a 3 párrafos", () => {
  for (const d of destinations) {
    assert.ok(d.name.es && d.name.en, `${d.slug}: falta el nombre`);
    assert.ok(d.title.es && d.title.en, `${d.slug}: falta el título`);
    assert.ok(d.summary.es && d.summary.en, `${d.slug}: falta el resumen`);
    assert.ok(
      d.paragraphs.length >= 2 && d.paragraphs.length <= 3,
      `${d.slug}: ${d.paragraphs.length} párrafos`,
    );
    for (const p of d.paragraphs) {
      assert.ok(p.es.length > 40 && p.en.length > 40, `${d.slug}: párrafo vacío`);
    }
  }
});

test("el texto de los destinos no contiene ninguna cifra", () => {
  for (const d of destinations) {
    const text = [d.name, d.title, d.summary, ...d.paragraphs]
      .flatMap((v) => [v.es, v.en])
      .join(" ");
    assert.equal(
      /\d/.test(text),
      false,
      `${d.slug}: el texto trae un número y en este bloque no hay dato nuevo que lo respalde`,
    );
  }
});

test("los productos de cada destino existen en el catálogo", () => {
  for (const d of destinations) {
    for (const slug of d.products) {
      assert.ok(catalogSlugs.has(slug), `${d.slug}: ${slug} no está en el catálogo`);
    }
  }
});

test("las rutas de los destinos son rutas que las naves publican", () => {
  const routes = new Set(vessels.flatMap((v) => v.routes));
  for (const d of destinations) {
    assert.ok(routes.has(d.route), `${d.slug}: ninguna nave sirve la ruta ${d.route}`);
  }
});

test("Bahía lista el tour y el party, los dos disponibles", () => {
  const bahia = getDestination("bahia")!;
  const { available, unavailable } = productsForDestination(bahia, ticketProducts);
  assert.deepEqual(
    available.map((p) => p.slug),
    ["tour-bahia", "party-bahia"],
  );
  assert.deepEqual(unavailable, []);
});

test("Taboga separa el ferry: hoy no se vende, así que no sale con precio", () => {
  const taboga = getDestination("taboga")!;
  const { available, unavailable } = productsForDestination(taboga, ticketProducts);
  assert.deepEqual(available, []);
  assert.deepEqual(
    unavailable.map((p) => p.slug),
    ["ferry-taboga"],
  );
});

test("Las Perlas separa el ferry a Contadora por lo mismo", () => {
  const perlas = getDestination("las-perlas")!;
  const { available, unavailable } = productsForDestination(perlas, ticketProducts);
  assert.deepEqual(available, []);
  assert.deepEqual(
    unavailable.map((p) => p.slug),
    ["ferry-contadora"],
  );
});

test("las tres naves sirven las tres rutas, así que aparecen en los tres destinos", () => {
  for (const d of destinations) {
    const mine = vesselsForDestination(d, vessels);
    assert.deepEqual(
      mine.map((v) => v.slug),
      ["aura", "pacific-ferry-1", "sirena-del-mar"],
      `${d.slug}: naves inesperadas`,
    );
  }
});

test("una nave apagada no aparece en ningún destino", () => {
  const bahia = getDestination("bahia")!;
  const apagada = vessels.map((v) => ({ ...v, active: v.slug !== "aura" }));
  assert.deepEqual(
    vesselsForDestination(bahia, apagada).map((v) => v.slug),
    ["pacific-ferry-1", "sirena-del-mar"],
  );
});

test("un slug de producto que ya no existe se ignora sin romper la página", () => {
  const inventado = { ...getDestination("bahia")!, products: ["no-existe", "tour-bahia"] };
  const { available, unavailable } = productsForDestination(inventado, ticketProducts);
  assert.deepEqual(
    available.map((p) => p.slug),
    ["tour-bahia"],
  );
  assert.deepEqual(unavailable, []);
});

test("un destino sin nada publicado devuelve listas vacías, no un hueco", () => {
  const vacio = {
    ...getDestination("bahia")!,
    products: [],
    route: "ruta-que-no-existe",
  };
  const { available, unavailable } = productsForDestination(vacio, ticketProducts);
  assert.deepEqual(available, []);
  assert.deepEqual(unavailable, []);
  assert.deepEqual(vesselsForDestination(vacio, vessels), []);
});
