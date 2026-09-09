#!/usr/bin/env node
/**
 * Humo manual del bloque 5 (códigos de aliado) contra un servidor levantado.
 * No forma parte de `lint`, `build` ni `test`: es la comprobación que documenta
 * el reporte.
 *
 *   npm run build && npx next start -p 3011
 *   node scripts/smoke-bloque5.mjs http://localhost:3011
 *
 * Sin `DATABASE_URL` el lead no se guarda y el código de aliado no se puede
 * validar contra `Reseller`: lo que este humo comprueba es la captura del
 * código en la cookie, la limpieza de la URL y que nada de eso bloquee el
 * handoff a Pacific Experience (regla 9).
 */
import process from "node:process";

const BASE = process.argv[2] ?? "http://localhost:3000";

function line(label, value) {
  console.log(`  ${label.padEnd(60)} ${value}`);
}

async function get(pathname, init) {
  const response = await fetch(`${BASE}${pathname}`, { redirect: "manual", ...init });
  return {
    code: response.status,
    location: response.headers.get("location"),
    cookies: response.headers.getSetCookie?.() ?? [],
    body: await response.text(),
  };
}

/** El valor de una cookie en las cabeceras `set-cookie` de la respuesta. */
function cookie(cookies, name) {
  const found = cookies.find((raw) => raw.startsWith(`${name}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1).split(";")[0]);
}

function has(cookies, name, flag) {
  const found = cookies.find((raw) => raw.startsWith(`${name}=`));
  return found ? found.toLowerCase().includes(flag.toLowerCase()) : false;
}

async function post(pathname, payload, init = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    body: JSON.stringify(payload),
  });
  return { code: response.status, body: await response.text() };
}

const FUTURE = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

async function main() {
  console.log(`\nHumo del bloque 5 — ${BASE}\n`);

  console.log("Captura del código por URL");
  for (const [url, expected] of [
    ["/?partner=HOTELX", "HOTELX"],
    ["/?partner=hotelx", "HOTELX"],
    ["/tours?ref=agenciay", "AGENCIAY"],
    // `partner` manda sobre `ref`.
    ["/?partner=HOTELX&ref=AGENCIAY", "HOTELX"],
    // Nuestro propio código en PEX no es un aliado.
    ["/?ref=ATLANTE", null],
  ]) {
    const { code, location, cookies } = await get(url);
    const value = cookie(cookies, "atl_partner");
    line(
      `GET ${url}`,
      `${code} → ${location ?? "—"} · atl_partner=${value ?? "—"} ${value === expected ? "OK" : "DISTINTO de " + expected}`,
    );
  }

  console.log("\nLimpieza del parámetro y cookie");
  {
    const { code, location, cookies } = await get(
      "/tours?partner=HOTELX&utm_source=meta&utm_campaign=lanzamiento",
    );
    line("GET /tours?partner=…&utm_… → 307", code);
    line("  destino sin `partner` y con las UTM intactas", location);
    line("  atl_partner", cookie(cookies, "atl_partner"));
    line("  atl_utm", cookie(cookies, "atl_utm"));
    line("  Max-Age de 30 días (2592000)", has(cookies, "atl_partner", "max-age=2592000"));
    line("  NO httpOnly (el funnel la lee)", !has(cookies, "atl_partner", "httponly"));
  }
  {
    // Con la cookie ya puesta manda la primera visita, pero la URL se limpia igual.
    const { code, location, cookies } = await get("/?partner=OTRO", {
      headers: { cookie: "atl_partner=HOTELX" },
    });
    line("GET /?partner=OTRO con atl_partner=HOTELX ya puesta", code);
    line("  destino", location);
    line("  no se reescribe la cookie (gana la primera visita)", cookie(cookies, "atl_partner") === null);
  }
  {
    const { code } = await get("/tours");
    line("GET /tours sin parámetros (no redirige)", code);
  }

  console.log("\nEl handoff nunca se bloquea por el código de aliado");
  {
    const { code, body } = await post(
      "/api/leads",
      {
        vessel: "aura",
        date: FUTURE,
        hours: 4,
        people: 15,
        occasion: "cumpleanos",
        name: "Ana Pérez",
        email: "ana@example.com",
        phone: "+50761234567",
        partnerCode: "NOEXISTE",
        accepted: true,
      },
      { headers: { cookie: "atl_partner=TAMPOCO" } },
    );
    const data = JSON.parse(body);
    line("POST /api/leads con un código inexistente", code);
    line("  destinationUrl con ref=ATLANTE", String(data.destinationUrl).includes("ref=ATLANTE"));
    line("  sin datos personales en la URL", !/name=|email=|phone=|nombre=|correo=|telefono=/.test(String(data.destinationUrl)));
  }

  console.log("\nAdmin (sin cookie: 307 al login)");
  for (const pathname of ["/admin/aliados", "/admin/comisiones", "/admin/comisiones/export?group=aliado"]) {
    const { code, location } = await get(pathname);
    line(`GET ${pathname}`, `${code} → ${location ?? "—"}`);
  }

  console.log("\nSin datos personales en ninguna URL de este humo: por diseño (regla 7).\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
