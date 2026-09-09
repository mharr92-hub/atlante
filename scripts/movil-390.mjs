#!/usr/bin/env node
/**
 * Comprobación móvil a 390 px (regla 14) — bloque 6.4.
 *
 * No es una captura: es la medición que hay detrás de una captura. Por cada
 * ruta mide el ancho real del documento (para descartar scroll horizontal), el
 * tamaño de letra más pequeño que se ve y el botón o enlace más bajo.
 *
 *   npm run build && npx next start -p 3016
 *   node scripts/movil-390.mjs http://localhost:3016
 *
 * Usa el Chromium que ya descargó Playwright para el e2e; no forma parte de
 * `lint`, `build`, `test` ni del CI.
 */
import process from "node:process";
import { chromium, devices } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3000";

const ROUTES = [
  "/",
  "/destinos/taboga",
  "/destinos/las-perlas",
  "/destinos/bahia",
  "/tours",
  "/charters",
  "/reservar/tour-bahia",
  "/en",
  "/en/destinos/bahia",
  "/en/charters",
];

/** Corre en el navegador: recorre el DOM visible y devuelve los mínimos. */
function measure() {
  const doc = document.documentElement;
  let minFont = Infinity;
  let minFontText = "";
  let minTap = Infinity;
  let minTapText = "";

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0";
  };

  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);

    // Texto propio del elemento (no el de sus hijos).
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (own) {
      const size = parseFloat(style.fontSize);
      if (size < minFont) {
        minFont = size;
        minFontText = own.slice(0, 40);
      }
    }

    // Lo que la regla 14 llama "botón": botones, campos y los enlaces que se
    // pintan como botón o como acción de una tarjeta. Un enlace dentro de una
    // frase es texto corrido y se mide por su tipografía, no por su altura.
    const control = el.matches(
      "button, summary, select, textarea, input:not([type=hidden]), " +
        "a.button, a.nav-cta, a.card-link, a.card-cta, .lang-toggle a, .site-footer nav a, .nav a",
    );
    if (control) {
      const h = el.getBoundingClientRect().height;
      if (h < minTap) {
        minTap = h;
        minTapText = (el.textContent || el.getAttribute("aria-label") || tag).trim().slice(0, 40);
      }
    }
  }

  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    minFont: Number.isFinite(minFont) ? Math.round(minFont * 10) / 10 : null,
    minFontText,
    minTap: Number.isFinite(minTap) ? Math.round(minTap * 10) / 10 : null,
    minTapText,
    h1: document.querySelector("h1")?.textContent?.trim().slice(0, 48) ?? "—",
  };
}

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["Pixel 5"],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

console.log(`\nMóvil 390 px — ${BASE}\n`);
console.log(
  `${"ruta".padEnd(24)} ${"ancho".padEnd(12)} ${"letra mín".padEnd(11)} ${"toque mín".padEnd(11)} h1`,
);

let problems = 0;
for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const m = await page.evaluate(measure);
  const overflow = m.scrollWidth > m.clientWidth;
  if (overflow || (m.minTap ?? 99) < 44) problems += 1;
  console.log(
    `${route.padEnd(24)} ${`${m.scrollWidth}/${m.clientWidth}${overflow ? " ✗" : ""}`.padEnd(12)} ` +
      `${`${m.minFont}px`.padEnd(11)} ${`${m.minTap}px`.padEnd(11)} ${m.h1}`,
  );
  if (m.minFont !== null && m.minFont < 13) {
    console.log(`    letra más pequeña de la página: "${m.minFontText}" (${m.minFont}px)`);
  }
  if (m.minTap !== null && m.minTap < 44) console.log(`    control por debajo de 44 px: "${m.minTapText}"`);
}

console.log(
  `\n${problems === 0 ? "Sin scroll horizontal y sin controles por debajo de 44 px." : `${problems} rutas con algo que revisar (arriba).`}`,
);
console.log(
  "La columna 'letra mín' es informativa: incluye las etiquetas en versalitas del\n" +
    "sistema de diseño (10–12 px, anteriores a este bloque). Ver el reporte.\n",
);

await browser.close();
