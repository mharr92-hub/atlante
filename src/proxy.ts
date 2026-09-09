import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Atribución de la primera visita.
 *
 * Guarda en cookies de 30 días de dónde vino la persona (`utm_*`), qué aliado
 * la mandó (`?partner=`) y por qué página entró, para que `POST /api/leads`
 * pueda copiarlo al lead aunque el funnel se complete tres páginas después.
 *
 * Sólo escribe si la cookie no existe: manda la PRIMERA visita, no la última.
 * Nunca guarda nombre, correo ni teléfono (regla 7): sólo campaña y ruta.
 *
 * Nota de Next.js 16: el archivo `middleware` está deprecado y se llama
 * `proxy`; la función exportada es `proxy`.
 */

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export const UTM_COOKIE = "atl_utm";
export const PARTNER_COOKIE = "atl_partner";
export const LANDING_COOKIE = "atl_landing";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const params = request.nextUrl.searchParams;

  const options = {
    maxAge: THIRTY_DAYS,
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
    if (utm.source || utm.medium || utm.campaign) {
      response.cookies.set(UTM_COOKIE, encodeURIComponent(JSON.stringify(utm)), options);
    }
  }

  const partner = params.get("partner");
  if (partner && !request.cookies.has(PARTNER_COOKIE)) {
    response.cookies.set(PARTNER_COOKIE, encodeURIComponent(partner.slice(0, 40)), options);
  }

  if (!request.cookies.has(LANDING_COOKIE)) {
    // Sólo la ruta: la query puede llevar cualquier cosa.
    response.cookies.set(LANDING_COOKIE, encodeURIComponent(request.nextUrl.pathname), options);
  }

  return response;
}

export const config = {
  matcher: [
    // Todo menos las APIs, los assets de Next y los archivos estáticos.
    "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)$).*)",
  ],
};
