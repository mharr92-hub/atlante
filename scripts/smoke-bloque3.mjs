#!/usr/bin/env node
/**
 * Humo manual del bloque 3 contra `npm run dev`. No forma parte de `lint`,
 * `build` ni `test`: es la comprobación que documenta el reporte.
 *
 *   node scripts/smoke-bloque3.mjs http://localhost:3005
 */
import { createHmac } from "node:crypto";
import process from "node:process";

const BASE = process.argv[2] ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const WEBHOOK_SECRET = process.env.PEX_WEBHOOK_SECRET ?? "";

function line(label, value) {
  console.log(`  ${label.padEnd(46)} ${value}`);
}

async function status(pathname, init) {
  const response = await fetch(`${BASE}${pathname}`, { redirect: "manual", ...init });
  return { code: response.status, body: await response.text() };
}

async function head(pathname) {
  const { code } = await status(pathname);
  line(`GET ${pathname}`, code);
  return code;
}

async function main() {
  console.log(`\nHumo del bloque 3 — ${BASE}\n`);

  console.log("Público");
  for (const pathname of [
    "/",
    "/tours",
    "/tours/tour-bahia",
    "/charters",
    "/reservar/tour-bahia",
    "/reservar/tour-bahia/listo",
    "/sitemap.xml",
    "/robots.txt",
  ]) {
    await head(pathname);
  }
  // Un producto que PEX no vende no tiene ficha.
  await head("/tours/ferry-taboga");

  console.log("\nAdmin (sin cookie: 307 al login)");
  for (const pathname of ["/admin", "/admin/catalogo", "/admin/comisiones", "/admin/comisiones/export"]) {
    await head(pathname);
  }

  console.log("\nCron");
  const noAuth = await status("/api/cron/sync-pex");
  line("GET /api/cron/sync-pex sin Authorization", `${noAuth.code} ${noAuth.body}`);
  const badAuth = await status("/api/cron/sync-pex", {
    headers: { authorization: "Bearer incorrecto" },
  });
  line("GET /api/cron/sync-pex con secreto malo", `${badAuth.code} ${badAuth.body}`);
  const okAuth = await status("/api/cron/sync-pex", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  line("GET /api/cron/sync-pex autorizado", `${okAuth.code} ${okAuth.body}`);
  const housekeeping = await status("/api/cron/leads-housekeeping", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  line("GET /api/cron/leads-housekeeping", `${housekeeping.code} ${housekeeping.body}`);

  console.log("\nWebhook de PEX");
  const payload = JSON.stringify({
    event: "booking.paid",
    pex_booking_id: "pex_humo_1",
    ref: "ATLANTE",
    ref_id: "ld_inexistente",
    amount: 50,
    currency: "USD",
    service_date: "2026-09-18",
  });
  const ts = String(Date.now());
  const sign = (timestamp, body) =>
    createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex");

  const good = await status("/api/pex/booking-confirmed", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pex-timestamp": ts,
      "x-pex-signature": sign(ts, payload),
    },
    body: payload,
  });
  line("POST firma válida (sin DB: 503)", `${good.code} ${good.body}`);

  const bad = await status("/api/pex/booking-confirmed", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pex-timestamp": ts,
      "x-pex-signature": "0".repeat(64),
    },
    body: payload,
  });
  line("POST firma inválida (401)", `${bad.code} ${bad.body}`);

  const oldTs = String(Date.now() - 10 * 60 * 1000);
  const stale = await status("/api/pex/booking-confirmed", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pex-timestamp": oldTs,
      "x-pex-signature": sign(oldTs, payload),
    },
    body: payload,
  });
  line("POST timestamp de hace 10 min (400)", `${stale.code} ${stale.body}`);

  console.log("\nLead sin base de datos");
  const lead = await status("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug: "tour-bahia",
      date: "2026-09-18",
      timeSlot: "17:30",
      slotId: "slot-inexistente",
      pax: { persona: 2 },
      addons: [],
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "60000000",
      accepted: true,
    }),
  });
  line("POST /api/leads con slotId sin snapshot", `${lead.code} ${lead.body}`);

  console.log("\nContenido");
  const step2 = await status("/reservar/tour-bahia?step=2");
  line(
    'paso 2 avisa "la disponibilidad final se confirma"',
    step2.body.includes("La disponibilidad final se confirma") ? "sí" : "NO",
  );
  line(
    "paso 2 no publica cupos inventados",
    step2.body.includes("cupos") ? "PUBLICA cupos" : "sí (modo puente)",
  );
  const home = await status("/");
  const catalog = await status("/tours");
  for (const [label, body] of [
    ["home", home.body],
    ["/tours", catalog.body],
    ["/reservar", step2.body],
  ]) {
    line(`${label} sin "Modo:" (sólo va en el admin)`, body.includes("Modo:") ? "FILTRA" : "sí");
  }
  line(
    "/tours lista los dos productos disponibles",
    catalog.body.includes("Tour por la Bah") && catalog.body.includes("Party en la Bah")
      ? "sí"
      : "NO",
  );
  line(
    "/tours no lista el ferry pausado",
    catalog.body.includes("Ferry a Isla Taboga") ? "LO LISTA" : "sí",
  );

  console.log("");
}

main().catch((error) => {
  console.error("humo:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
