/**
 * Rutas por idioma (bloque 6.2).
 *
 * Decisión: **prefijo `/en` reescrito en `src/proxy.ts`**, no un segmento
 * `[locale]`. Es la opción más simple compatible con Next.js 16 y la que menos
 * mueve el árbol de `app/`: `/en/tours` se reescribe a `/tours` y el proxy pasa
 * el idioma en la cabecera `x-atlante-locale`, que el layout raíz lee con
 * `headers()`. Un segmento `[locale]` habría obligado a mover las 20 rutas
 * públicas (y el admin, que no se traduce) dentro de una carpeta nueva.
 *
 * Consecuencia: **la URL manda**. `/tours` es siempre español y `/en/tours`
 * siempre inglés, para cualquiera que entre —persona o robot— sin depender de
 * cookies. Por eso la cookie `locale` de los bloques anteriores desaparece: la
 * preferencia vive en el enlace que compartes.
 *
 * Funciones puras, sin `next/headers` ni Prisma: las comparten el proxy (edge),
 * el servidor, el cliente y los tests.
 */
import type { Locale } from "@/content/catalog";
import { site } from "@/config/site";

export type { Locale };

export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES: Locale[] = ["es", "en"];

/** Prefijo de las rutas en inglés. El español no lleva prefijo. */
export const EN_PREFIX = "/en";

/** Cabecera con la que el proxy le dice al servidor en qué idioma se pidió. */
export const LOCALE_HEADER = "x-atlante-locale";

/** Cabecera con la ruta pública original (`/en/tours`), antes de reescribir. */
export const PATH_HEADER = "x-atlante-path";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "es" || value === "en";
}

/** Normaliza a una ruta absoluta sin barra final: `""` y `"/en/"` → `"/"`. */
function normalize(path: string): string {
  const trimmed = (path || "").trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

/**
 * Parte una ruta en idioma + ruta sin prefijo.
 * `/en/tours` → `{ en, /tours }` · `/en` → `{ en, / }` · `/english` → `{ es, /english }`.
 */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  const path = normalize(pathname);
  if (path === EN_PREFIX) return { locale: "en", path: "/" };
  if (path.startsWith(`${EN_PREFIX}/`)) {
    return { locale: "en", path: path.slice(EN_PREFIX.length) };
  }
  return { locale: DEFAULT_LOCALE, path };
}

/** Ruta canónica de una página en un idioma: `/tours` + `en` → `/en/tours`. */
export function localePath(path: string, locale: Locale): string {
  const clean = splitLocalePath(path).path;
  if (locale !== "en") return clean;
  return clean === "/" ? EN_PREFIX : `${EN_PREFIX}${clean}`;
}

/**
 * Lo mismo para un `href` cualquiera: respeta query y ancla, y deja intacto lo
 * que no es una ruta interna (`https://…`, `mailto:`, `#ancla`, `//host`).
 */
export function localeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? "" : href.slice(cut);
  const localized = localePath(path, locale);
  // `/` + `#destinos` no debe quedar como `//destinos` ni `/en/#destinos`.
  return `${localized === "/" && rest.startsWith("#") ? "" : localized}${rest}`;
}

/** URL absoluta de una página en un idioma, para canonical, hreflang y sitemap. */
export function localeUrl(path: string, locale: Locale): string {
  const localized = localePath(path, locale);
  return `${site.url}${localized === "/" ? "" : localized}`;
}

/**
 * Las dos versiones de una página + `x-default`.
 *
 * `x-default` apunta al español: es el idioma por defecto del sitio y el que ve
 * quien llega sin preferencia (PRD 5.11).
 */
export function languageAlternates(path: string): Record<string, string> {
  return {
    es: localeUrl(path, "es"),
    en: localeUrl(path, "en"),
    "x-default": localeUrl(path, "es"),
  };
}

/**
 * El bloque `alternates` de `metadata`: canonical autorreferente (cada idioma se
 * apunta a sí mismo) + las dos alternativas.
 */
export function alternatesFor(path: string, locale: Locale) {
  return {
    canonical: localeUrl(path, locale),
    languages: languageAlternates(path),
  };
}
