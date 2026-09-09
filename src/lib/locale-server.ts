/**
 * El idioma del lado del servidor (bloque 6.2).
 *
 * Lo pone `src/proxy.ts` en la cabecera `x-atlante-locale` al reescribir `/en/*`.
 * Sin proxy —un test, una llamada interna— se cae al español, que es el idioma
 * por defecto del sitio.
 *
 * `server-only` porque usa `next/headers`; la lógica pura vive en
 * `lib/locale-routing.ts` y es la que se prueba.
 */
import "server-only";
import { headers } from "next/headers";
import {
  alternatesFor,
  DEFAULT_LOCALE,
  isLocale,
  localeHref,
  LOCALE_HEADER,
  PATH_HEADER,
  splitLocalePath,
  type Locale,
} from "@/lib/locale-routing";

/** Idioma de la petición actual. */
export async function getLocale(): Promise<Locale> {
  const store = await headers();
  const value = store.get(LOCALE_HEADER);
  if (isLocale(value)) return value;

  // Respaldo por si la cabecera no llega (p. ej. una ruta fuera del matcher):
  // se deduce de la ruta pública original.
  const path = store.get(PATH_HEADER);
  return path ? splitLocalePath(path).locale : DEFAULT_LOCALE;
}

/** `alternates` de `metadata` para una ruta sin prefijo (`/tours`). */
export async function pageAlternates(path: string) {
  return alternatesFor(path, await getLocale());
}

/** Un `href` interno en el idioma de la petición, para `redirect()`. */
export async function localeRedirect(href: string): Promise<string> {
  return localeHref(href, await getLocale());
}
