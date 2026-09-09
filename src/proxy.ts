import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ATTRIBUTION_MAX_AGE,
  LANDING_COOKIE,
  PARTNER_COOKIE,
  UTM_COOKIE,
} from "@/lib/attribution-cookies";
import { normalizePartnerCode } from "@/lib/partner-codes";
import { LOCALE_HEADER, PATH_HEADER, splitLocalePath } from "@/lib/locale-routing";

/**
 * Dos cosas, en este orden: idioma y atribución.
 *
 * 1. **Idioma (bloque 6.2)**: `/en/loquesea` se reescribe a `/loquesea` y el
 *    idioma viaja al servidor en la cabecera `x-atlante-locale`. La barra de
 *    direcciones sigue mostrando `/en/…`, así que la URL en inglés se puede
 *    compartir, indexar y declarar en `hreflang`. Sin prefijo, español.
 *
 * 2. **Atribución de la primera visita**: guarda en cookies de 30 días de dónde
 *    vino la persona (`utm_*`), qué aliado la mandó (`?partner=` o `?ref=`) y
 *    por qué página entró, para que `POST /api/leads` pueda copiarlo al lead
 *    aunque el funnel se complete tres páginas después.
 *    Sólo escribe si la cookie no existe: manda la PRIMERA visita, no la última.
 *    Nunca guarda nombre, correo ni teléfono (regla 7): sólo campaña y ruta.
 *
 * El código del aliado se limpia de la URL con una redirección (bloque 5.1),
 * conservando el prefijo de idioma. La cookie no es `httpOnly` porque el paso 3
 * del funnel la lee desde el navegador para prellenar el campo.
 *
 * Nota de Next.js 16: el archivo `middleware` está deprecado y se llama
 * `proxy`; la función exportada es `proxy`.
 */

/** Parámetros de entrada de un aliado, en orden de prioridad. */
const PARTNER_PARAMS = ["partner", "ref"] as const;

export function proxy(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const { locale, path } = splitLocalePath(request.nextUrl.pathname);

  // `partner` manda sobre `ref`; `normalizePartnerCode` descarta `ATLANTE`, que
  // es nuestro propio código en PEX y no pertenece a ningún aliado.
  let partner: string | null = null;
  let carriesParam = false;
  for (const key of PARTNER_PARAMS) {
    if (!params.has(key)) continue;
    carriesParam = true;
    partner = partner ?? normalizePartnerCode(params.get(key));
  }

  // Sólo se redirige en una navegación: un POST (acción de servidor) conserva
  // su URL tal cual.
  const clean =
    carriesParam && (request.method === "GET" || request.method === "HEAD");

  // El idioma viaja al servidor por cabecera de petición; la ruta original
  // también, para que `getLocale()` tenga un respaldo.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  requestHeaders.set(PATH_HEADER, request.nextUrl.pathname);
  const forward = { request: { headers: requestHeaders } };

  let response: NextResponse;
  if (clean) {
    // La redirección conserva el prefijo de idioma: `/en/tours?partner=X` sale
    // a `/en/tours`, no al español.
    const url = request.nextUrl.clone();
    for (const key of PARTNER_PARAMS) url.searchParams.delete(key);
    response = NextResponse.redirect(url, 307);
  } else if (locale === "en") {
    const url = request.nextUrl.clone();
    url.pathname = path;
    response = NextResponse.rewrite(url, forward);
  } else {
    response = NextResponse.next(forward);
  }

  const options = {
    maxAge: ATTRIBUTION_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };

  if (!request.cookies.has(UTM_COOKIE)) {
    const utm = {
      source: params.get("utm_source") ?? undefined,
      medium: params.get("utm_medium") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
    };
    // `cookies.set` ya codifica el valor: codificarlo aquí lo dejaría doble.
    if (utm.source || utm.medium || utm.campaign) {
      response.cookies.set(UTM_COOKIE, JSON.stringify(utm), options);
    }
  }

  if (partner && !request.cookies.has(PARTNER_COOKIE)) {
    response.cookies.set(PARTNER_COOKIE, partner, options);
  }

  if (!request.cookies.has(LANDING_COOKIE)) {
    // Sólo la ruta sin prefijo: la query puede llevar cualquier cosa y el
    // idioma no cambia por dónde entró la persona.
    response.cookies.set(LANDING_COOKIE, path, options);
  }

  return response;
}

export const config = {
  matcher: [
    // Todo menos las APIs, los assets de Next y los archivos estáticos.
    "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)$).*)",
  ],
};
