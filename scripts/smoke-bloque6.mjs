#!/usr/bin/env node
/**
 * Humo manual del bloque 6 (destinos + inglés con hreflang) contra un servidor
 * levantado. No forma parte de `lint`, `build` ni `test`: es la comprobación que
 * documenta el reporte, igual que los humos de los bloques 3, 4 y 5.
 *
 *   npm run build && npx next start -p 3016
 *   node scripts/smoke-bloque6.mjs http://localhost:3016
 *
 * Corre sin `DATABASE_URL`: el catálogo y las naves salen del respaldo en código
 * (regla 9), que es justo lo que las páginas de destino tienen que aguantar.
 */
import process from "node:process";

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;

function line(label, value, ok) {
  const mark = ok === undefined ? " " : ok ? "OK" : "FALLA";
  if (ok === false) failures += 1;
  console.log(`  ${label.padEnd(58)} ${String(value).padEnd(28)} ${mark}`);
}

async function get(pathname, init) {
  const response = await fetch(`${BASE}${pathname}`, { redirect: "manual", ...init });
  return {
    code: response.status,
    location: response.headers.get("location"),
    body: await response.text(),
  };
}

/**
 * Los `<link rel="alternate" hreflang>` de una página, como { hreflang: href }.
 * Las expresiones van sin distinguir mayúsculas porque Next serializa el
 * atributo como `hrefLang`; en HTML el nombre no distingue mayúsculas.
 */
function hreflangs(html) {
  const out = {};
  const re = /<link[^>]*rel="alternate"[^>]*>/gi;
  for (const tag of html.match(re) ?? []) {
    const lang = /hreflang="([^"]+)"/i.exec(tag);
    const href = /href="([^"]+)"/i.exec(tag);
    if (lang && href) out[lang[1]] = href[1];
  }
  return out;
}

function canonical(html) {
  return /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html)?.[1] ?? null;
}

function lang(html) {
  return /<html[^>]*\slang="([^"]+)"/i.exec(html)?.[1] ?? null;
}

const SITE = "https://www.atlantedelpacifico.lat";

async function main() {
  console.log(`\nHumo del bloque 6 — ${BASE}\n`);

  console.log("6.1 · Páginas de destino");
  for (const [slug, expect] of [
    ["taboga", { tickets: false, vessels: true, pending: "Ferry a Isla Taboga" }],
    ["las-perlas", { tickets: false, vessels: true, pending: "Ferry a Contadora" }],
    ["bahia", { tickets: true, vessels: true, pending: null }],
  ]) {
    const { code, body } = await get(`/destinos/${slug}`);
    line(`GET /destinos/${slug}`, code, code === 200);
    line("  JSON-LD TouristDestination", body.includes('"TouristDestination"'), body.includes('"TouristDestination"'));
    line("  sin aggregateRating", !body.includes("aggregateRating"), !body.includes("aggregateRating"));
    if (expect.tickets) {
      line("  CTA de ticket /reservar/", body.includes("/reservar/"), body.includes("/reservar/"));
    }
    if (expect.vessels) {
      line("  CTA de nave /charters/", body.includes("/charters/"), body.includes("/charters/"));
    }
    if (expect.pending) {
      line(`  "${expect.pending}" sin CTA`, body.includes(expect.pending), body.includes(expect.pending));
    }
  }
  {
    const { code } = await get("/destinos/no-existe");
    line("GET /destinos/no-existe", code, code === 404);
  }
  {
    const { body } = await get("/sitemap.xml");
    const all = ["taboga", "las-perlas", "bahia"].every((s) =>
      body.includes(`${SITE}/destinos/${s}`),
    );
    line("sitemap.xml lista los tres destinos", all, all);
    const alt = body.includes(`${SITE}/en/tours`);
    line("sitemap.xml declara la alternativa en inglés", alt, alt);
  }

  console.log("\n6.2 · Rutas /en/* y hreflang");
  for (const path of [
    "/",
    "/tours",
    "/charters",
    "/charters/comparar",
    "/destinos/taboga",
    "/tours/tour-bahia",
    "/charters/aura",
    "/como-funciona",
    "/terminos",
    "/privacidad",
    "/cancelaciones",
    "/aliados",
    "/aliados/registro",
  ]) {
    const enPath = path === "/" ? "/en" : `/en${path}`;
    const es = await get(path);
    const en = await get(enPath);
    const esUrl = path === "/" ? SITE : `${SITE}${path}`;
    const enUrl = `${SITE}${enPath}`;

    const esAlt = hreflangs(es.body);
    const enAlt = hreflangs(en.body);

    const ok =
      es.code === 200 &&
      en.code === 200 &&
      lang(es.body) === "es" &&
      lang(en.body) === "en" &&
      canonical(es.body) === esUrl &&
      canonical(en.body) === enUrl &&
      esAlt.es === esUrl &&
      esAlt.en === enUrl &&
      esAlt["x-default"] === esUrl &&
      enAlt.es === esUrl &&
      enAlt.en === enUrl &&
      enAlt["x-default"] === esUrl;

    line(`${path}  +  ${enPath}`, `${es.code}/${en.code} · ${lang(es.body)}/${lang(en.body)}`, ok);
  }

  console.log("\n  El inglés se ve de verdad (no es el español con otra URL)");
  for (const [path, needle] of [
    ["/en/tours", "Tickets and tours"],
    ["/en/charters", "Compare vessels"],
    ["/en/destinos/bahia", "every way to sail it"],
    ["/en/como-funciona", "How it works"],
    ["/en/terminos", "Terms and conditions"],
    ["/en/reservar/tour-bahia", "Step 1 of 3"],
  ]) {
    const { body } = await get(path);
    line(`${path} contiene "${needle}"`, body.includes(needle), body.includes(needle));
  }

  console.log("\n  Los enlaces internos se quedan en inglés");
  {
    const { body } = await get("/en/tours");
    const ok = body.includes('href="/en/reservar/tour-bahia"');
    line("/en/tours enlaza a /en/reservar/tour-bahia", ok, ok);
    const selector = body.includes('href="/tours"') && body.includes('href="/en/tours"');
    line("selector ES/EN con las dos rutas equivalentes", selector, selector);
  }

  console.log("\n  Rutas de tránsito: siguen fuera del índice y sin hreflang");
  for (const path of ["/reservar/tour-bahia/listo", "/en/reservar/tour-bahia/listo"]) {
    const { code, body } = await get(path);
    const noindex = body.includes("noindex");
    const noAlt = Object.keys(hreflangs(body)).length === 0;
    line(`GET ${path}`, `${code} · noindex=${noindex}`, code === 200 && noindex && noAlt);
  }

  console.log("\n  El aliado y las 301 conservan el idioma");
  {
    const { code, location } = await get("/en/tours?partner=HOTELX");
    line("GET /en/tours?partner=HOTELX", `${code} → ${location ?? "—"}`, code === 307 && location?.endsWith("/en/tours"));
  }
  {
    const { code, location } = await get("/en/compare");
    line("GET /en/compare", `${code} → ${location ?? "—"}`, code === 308 && location === "/en/charters/comparar");
  }
  {
    const { code, location } = await get("/compare");
    line("GET /compare", `${code} → ${location ?? "—"}`, code === 308 && location === "/charters/comparar");
  }

  console.log(`\n${failures === 0 ? "Todo OK" : `${failures} comprobaciones fallaron`}\n`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
