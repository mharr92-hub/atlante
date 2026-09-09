/**
 * Rutas por idioma (bloque 6.2).
 *
 * Lo que se prueba es la única pieza que decide qué URL corresponde a qué
 * idioma: el proxy, el layout, `LocaleLink`, el selector del header, el sitemap
 * y el `hreflang` de cada página llaman todos a estas funciones.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  alternatesFor,
  EN_PREFIX,
  isLocale,
  languageAlternates,
  localeHref,
  localePath,
  localeUrl,
  splitLocalePath,
} from "@/lib/locale-routing";

const SITE = "https://www.atlantedelpacifico.lat";

test("el prefijo del inglés es /en y el español no lleva ninguno", () => {
  assert.equal(EN_PREFIX, "/en");
  assert.equal(localePath("/tours", "es"), "/tours");
  assert.equal(localePath("/tours", "en"), "/en/tours");
});

test("la raíz en inglés es /en, no /en/", () => {
  assert.equal(localePath("/", "en"), "/en");
  assert.equal(localePath("/", "es"), "/");
  assert.equal(localeUrl("/", "en"), `${SITE}/en`);
  assert.equal(localeUrl("/", "es"), SITE);
});

test("splitLocalePath separa idioma y ruta", () => {
  assert.deepEqual(splitLocalePath("/en/tours"), { locale: "en", path: "/tours" });
  assert.deepEqual(splitLocalePath("/en"), { locale: "en", path: "/" });
  assert.deepEqual(splitLocalePath("/en/"), { locale: "en", path: "/" });
  assert.deepEqual(splitLocalePath("/tours"), { locale: "es", path: "/tours" });
  assert.deepEqual(splitLocalePath("/"), { locale: "es", path: "/" });
});

test("una ruta que empieza por 'en' pero no es el prefijo sigue en español", () => {
  assert.deepEqual(splitLocalePath("/english"), { locale: "es", path: "/english" });
  assert.deepEqual(splitLocalePath("/entradas"), { locale: "es", path: "/entradas" });
});

test("aplicar el idioma dos veces no duplica el prefijo", () => {
  assert.equal(localePath("/en/tours", "en"), "/en/tours");
  assert.equal(localePath("/en/tours", "es"), "/tours");
  assert.equal(localePath(localePath("/tours", "en"), "en"), "/en/tours");
});

test("localeHref respeta la query y el ancla", () => {
  assert.equal(localeHref("/charters/comparar?v=aura", "en"), "/en/charters/comparar?v=aura");
  assert.equal(localeHref("/charters/comparar?v=aura", "es"), "/charters/comparar?v=aura");
  assert.equal(localeHref("/#destinos", "en"), "/en#destinos");
  assert.equal(localeHref("/#destinos", "es"), "#destinos");
  assert.equal(localeHref("/reservar/tour-bahia/listo?lead=ld_1", "en"), "/en/reservar/tour-bahia/listo?lead=ld_1");
});

test("localeHref no toca lo que no es una ruta interna", () => {
  for (const href of [
    "https://wa.me/50768603623",
    "mailto:hola@example.com",
    "#contacto",
    "//cdn.example.com/a.png",
  ]) {
    assert.equal(localeHref(href, "en"), href, href);
  }
});

test("cada página declara las dos versiones y x-default en español", () => {
  assert.deepEqual(languageAlternates("/destinos/taboga"), {
    es: `${SITE}/destinos/taboga`,
    en: `${SITE}/en/destinos/taboga`,
    "x-default": `${SITE}/destinos/taboga`,
  });
});

test("el canonical es autorreferente: cada idioma se apunta a sí mismo", () => {
  const es = alternatesFor("/tours", "es");
  const en = alternatesFor("/tours", "en");
  assert.equal(es.canonical, `${SITE}/tours`);
  assert.equal(en.canonical, `${SITE}/en/tours`);
  // Las alternativas son las mismas en las dos versiones: es lo que pide Google.
  assert.deepEqual(es.languages, en.languages);
});

test("isLocale sólo acepta los dos idiomas del sitio", () => {
  assert.equal(isLocale("es"), true);
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("fr"), false);
  assert.equal(isLocale(null), false);
  assert.equal(isLocale(undefined), false);
});
