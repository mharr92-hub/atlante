import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ATTRIBUTION_MAX_AGE,
  LANDING_COOKIE,
  PARTNER_COOKIE,
  UTM_COOKIE,
} from "@/lib/attribution-cookies";
import { normalizePartnerCode } from "@/lib/partner-codes";

/**
 * Atribución de la primera visita.
 *
 * Guarda en cookies de 30 días de dónde vino la persona (`utm_*`), qué aliado
 * la mandó (`?partner=` o `?ref=`) y por qué página entró, para que
 * `POST /api/leads` pueda copiarlo al lead aunque el funnel se complete tres
 * páginas después.
 *
 * Sólo escribe si la cookie no existe: manda la PRIMERA visita, no la última.
 * Nunca guarda nombre, correo ni teléfono (regla 7): sólo campaña y ruta.
 *
 * El código del aliado se limpia de la URL con una redirección (bloque 5.1):
 * el enlace de invitación `…/?partner=HOTELX` deja la cookie y la persona
 * termina en la URL canónica, sin el parámetro. La cookie no es `httpOnly`
 * porque el paso 3 del funnel la lee desde el navegador para prellenar el campo.
 *
 * Nota de Next.js 16: el archivo `middleware` está deprecado y se llama
 * `proxy`; la función exportada es `proxy`.
 */

/** Parámetros de entrada de un aliado, en orden de prioridad. */
const PARTNER_PARAMS = ["partner", "ref"] as const;

export function proxy(request: NextRequest) {
  const params = request.nextUrl.searchParams;

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

  let response: NextResponse;
  if (clean) {
    const url = request.nextUrl.clone();
    for (const key of PARTNER_PARAMS) url.searchParams.delete(key);
    response = NextResponse.redirect(url, 307);
  } else {
    response = NextResponse.next();
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
    // Sólo la ruta: la query puede llevar cualquier cosa.
    response.cookies.set(LANDING_COOKIE, request.nextUrl.pathname, options);
  }

  return response;
}

export const config = {
  matcher: [
    // Todo menos las APIs, los assets de Next y los archivos estáticos.
    "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)$).*)",
  ],
};
