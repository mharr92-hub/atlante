#!/usr/bin/env node
/**
 * Humo manual del bloque 4 contra `npm run dev`. No forma parte de `lint`,
 * `build` ni `test`: es la comprobación que documenta el reporte.
 *
 *   node scripts/smoke-bloque4.mjs http://localhost:3007
 */
import process from "node:process";

const BASE = process.argv[2] ?? "http://localhost:3000";

function line(label, value) {
  console.log(`  ${label.padEnd(56)} ${value}`);
}

async function get(pathname, init) {
  const response = await fetch(`${BASE}${pathname}`, { redirect: "manual", ...init });
  return {
    code: response.status,
    location: response.headers.get("location"),
    body: await response.text(),
  };
}

async function head(pathname) {
  const { code, location } = await get(pathname);
  line(`GET ${pathname}`, location ? `${code} → ${location}` : code);
  return code;
}

async function post(pathname, payload) {
  const response = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { code: response.status, body: await response.text() };
}

async function main() {
  console.log(`\nHumo del bloque 4 — ${BASE}\n`);

  console.log("Público");
  for (const pathname of [
    "/",
    "/charters",
    "/charters?people=80&hours=12&route=perlas",
    "/charters/aura",
    "/charters/pacific-ferry-1",
    "/charters/sirena-del-mar",
    "/charters/comparar?v=aura,sirena-del-mar&people=80",
    "/charters/aura/listo",
    "/aliados",
    "/aliados/registro",
    "/sitemap.xml",
    "/robots.txt",
  ]) {
    await head(pathname);
  }

  console.log("\nRedirecciones y 404");
  await head("/compare");
  // Nave con cierre `deeplink`: /cotizar no aplica y manda a la ficha.
  await head("/cotizar/aura");
  await head("/charters/no-existe");
  await head("/cotizar/no-existe");

  console.log("\nAdmin (sin cookie: 307 al login)");
  for (const pathname of [
    "/admin/naves",
    "/admin/naves/aura",
    "/admin/operadores",
    "/admin/operadores/pex",
    "/admin/aliados",
  ]) {
    await head(pathname);
  }

  console.log("\nLead de charter (POST /api/leads con `vessel`)");
  const lead = await post("/api/leads", {
    vessel: "aura",
    date: "2026-10-10",
    hours: 4,
    people: 15,
    occasion: "cumpleanos",
    name: "Maria Perez",
    email: "maria@example.com",
    phone: "60000000",
    accepted: true,
  });
  line("nave válida", `${lead.code} ${lead.body}`);

  const sinAcepta = await post("/api/leads", {
    vessel: "aura",
    people: 15,
    name: "Maria Perez",
    email: "maria@example.com",
    phone: "60000000",
  });
  line("sin la casilla de autorización", `${sinAcepta.code} ${sinAcepta.body}`);

  const capacidad = await post("/api/leads", {
    vessel: "aura",
    people: 200,
    name: "Maria Perez",
    email: "maria@example.com",
    phone: "60000000",
    accepted: true,
  });
  line("más personas que la capacidad", `${capacidad.code} ${capacidad.body}`);

  const jornada = await post("/api/leads", {
    vessel: "aura",
    hours: 12,
    people: 10,
    name: "Maria Perez",
    email: "maria@example.com",
    phone: "60000000",
    accepted: true,
  });
  line("jornada que la nave no publica", `${jornada.code} ${jornada.body}`);

  const naveMala = await post("/api/leads", {
    vessel: "no-existe",
    people: 4,
    name: "Maria Perez",
    email: "maria@example.com",
    phone: "60000000",
    accepted: true,
  });
  line("nave inexistente", `${naveMala.code} ${naveMala.body}`);

  console.log("\nSolicitud de aliado (POST /api/partner-applications)");
  const partner = await post("/api/partner-applications", {
    kind: "operator",
    name: "Marina X",
    vesselName: "Nave X",
    capacity: 20,
    whatsapp: "60000001",
    email: "hola@example.com",
    photos: "https://example.com/1.jpg\nhttps://example.com/2.jpg",
    message: "Queremos publicar la nave.",
  });
  line("solicitud válida (sin DB: saved=false)", `${partner.code} ${partner.body}`);

  const partnerMalo = await post("/api/partner-applications", {
    kind: "operator",
    name: "Marina X",
    whatsapp: "1",
  });
  line("WhatsApp inválido", `${partnerMalo.code} ${partnerMalo.body}`);

  const sinNombre = await post("/api/partner-applications", {
    kind: "operator",
    name: "X",
    whatsapp: "60000001",
  });
  line("nombre demasiado corto", `${sinNombre.code} ${sinNombre.body}`);

  console.log("\nContenido");
  const charters = await get("/charters");
  line("«desde $86.67 por persona» en /charters", charters.body.includes("86.67"));
  line("«Reserva directa» en /charters", charters.body.includes("Reserva directa"));
  line("«Operador verificado» NO aparece", !charters.body.includes("Operador verificado"));

  const home = await get("/");
  line("la home publica el precio por persona (15 pax)", home.body.includes("86.67"));

  const ficha = await get("/charters/sirena-del-mar");
  line("la ficha del Sirena publica el tramo de $5,380", ficha.body.includes("5,380"));
  line("la ficha NO trae el WhatsApp de PEX", !ficha.body.includes("6493"));

  const sitemap = await get("/sitemap.xml");
  for (const slug of ["aura", "pacific-ferry-1", "sirena-del-mar"]) {
    line(`sitemap incluye /charters/${slug}`, sitemap.body.includes(`/charters/${slug}<`));
  }
  const robots = await get("/robots.txt");
  line("robots bloquea /cotizar", robots.body.includes("/cotizar"));
  line("robots bloquea /charters/*/listo", robots.body.includes("/charters/*/listo"));

  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
