#!/usr/bin/env node
/**
 * `npm run check:pex` — verificación del catálogo contra Pacific Experience
 * (bloque 3.5).
 *
 * Para cada producto con `sourceUrl`, descarga la página pública de PEX y
 * compara dos cosas contra el catálogo: el precio "desde" y la disponibilidad.
 * Imprime una tabla de diferencias y termina con exit 1 si hay alguna.
 *
 * SÓLO REPORTA: nunca escribe en la base de datos ni en el catálogo. La
 * corrección se hace a mano en `/admin/catalogo` (y ahí mismo está el botón
 * "Marcar verificado hoy").
 *
 * La comparación es una heurística sobre el HTML público de PEX — no hay feed
 * todavía (cambio X4). Un aviso puede ser un falso positivo si PEX cambia su
 * maquetación: por eso el script explica siempre qué encontró.
 *
 * Fuente del catálogo: la tabla `Product` si hay `DATABASE_URL`, y si no el
 * catálogo en código. Se ejecuta con tsx para poder importar el `.ts`.
 */
import process from "node:process";

const TIMEOUT_MS = 12_000;

/** Señales de "no disponible" en las páginas de PEX (ES y EN). */
const UNAVAILABLE_MARKERS = [
  "no disponible",
  "no está disponible",
  "not available",
  "unavailable",
  "agotado",
  "sold out",
  "próximamente",
  "proximamente",
  "coming soon",
];

// ------------------------------------------------------------- catálogo -----

async function loadFromDb() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      const rows = await prisma.product.findMany({
        orderBy: [{ order: "asc" }, { slug: "asc" }],
        select: {
          slug: true,
          name: true,
          priceFrom: true,
          available: true,
          sourceUrl: true,
          verifiedAt: true,
        },
      });
      if (rows.length === 0) return null;
      return rows.map((row) => ({
        slug: row.slug,
        name: row.name?.es ?? row.slug,
        priceFrom: Number(row.priceFrom),
        available: row.available,
        sourceUrl: row.sourceUrl ?? "",
        verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString().slice(0, 10) : "",
      }));
    } finally {
      await prisma.$disconnect();
    }
  } catch {
    console.warn("  (no se pudo leer la base de datos; se usa el catálogo en código)");
    return null;
  }
}

async function loadCatalog() {
  const fromDb = await loadFromDb();
  if (fromDb) return { source: "base de datos", products: fromDb };

  const { catalog } = await import("../src/content/catalog.ts");
  return {
    source: "código",
    products: catalog.map((p) => ({
      slug: p.slug,
      name: p.name.es,
      priceFrom: p.priceFrom,
      available: p.available,
      sourceUrl: p.sourceUrl,
      verifiedAt: p.verifiedAt,
    })),
  };
}

// ----------------------------------------------------------------- red ------

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "text/html", "user-agent": "atlante-check-pex" },
    });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    return { ok: true, html: await response.text() };
  } catch (error) {
    return { ok: false, reason: error?.name === "AbortError" ? "timeout" : "sin respuesta" };
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------- análisis ----

/** HTML → texto plano en minúsculas, sin scripts ni estilos. */
export function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Todos los importes `$1,234.50` que aparecen en el texto. */
export function pricesIn(text) {
  const found = new Set();
  for (const match of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g)) {
    const value = Number(match[1].replaceAll(",", ""));
    if (Number.isFinite(value)) found.add(value);
  }
  return [...found].sort((a, b) => a - b);
}

export function looksUnavailable(text) {
  return UNAVAILABLE_MARKERS.some((marker) => text.includes(marker));
}

/** Diferencias entre lo que dice el catálogo y lo que dice la página. */
export function diffProduct(product, text) {
  const diffs = [];
  const prices = pricesIn(text);

  if (prices.length === 0) {
    diffs.push("la página no publica ningún precio visible en el HTML");
  } else if (!prices.includes(product.priceFrom)) {
    diffs.push(
      `precio desde $${product.priceFrom} no aparece en la página (encontrados: ${prices
        .slice(0, 8)
        .map((p) => `$${p}`)
        .join(", ")})`,
    );
  }

  const unavailable = looksUnavailable(text);
  if (product.available && unavailable) {
    diffs.push('el catálogo lo marca disponible y la página dice "no disponible"');
  }
  if (!product.available && !unavailable) {
    diffs.push("el catálogo lo marca no disponible y la página no lo dice");
  }

  return diffs;
}

// ------------------------------------------------------------------ main ----

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

async function main() {
  const { source, products } = await loadCatalog();
  const withSource = products.filter((p) => p.sourceUrl);

  console.log(`check:pex — catálogo desde ${source}; ${withSource.length} productos con fuente\n`);

  const findings = [];
  for (const product of withSource) {
    const page = await fetchPage(product.sourceUrl);
    if (!page.ok) {
      findings.push({ product, diffs: [`no se pudo leer la página (${page.reason})`] });
      console.log(`  ✖ ${pad(product.slug, 26)} ${page.reason}`);
      continue;
    }

    const diffs = diffProduct(product, toText(page.html));
    if (diffs.length === 0) {
      console.log(`  ✔ ${pad(product.slug, 26)} $${product.priceFrom} · ${product.available ? "disponible" : "no disponible"}`);
    } else {
      findings.push({ product, diffs });
      console.log(`  ✖ ${pad(product.slug, 26)} ${diffs.length} diferencia(s)`);
    }
  }

  if (findings.length === 0) {
    console.log("\n✔ Sin diferencias con Pacific Experience.");
    return 0;
  }

  console.log("\nDiferencias\n");
  for (const { product, diffs } of findings) {
    console.log(`  ${product.name} (${product.slug})`);
    console.log(`    fuente:     ${product.sourceUrl}`);
    console.log(`    verificado: ${product.verifiedAt || "nunca"}`);
    for (const diff of diffs) console.log(`    · ${diff}`);
    console.log("");
  }
  console.log(
    "Este script sólo reporta. Corrige en /admin/catalogo y usa \"Marcar verificado hoy\".\n",
  );
  return 1;
}

// Importable desde los tests sin disparar la corrida.
if (process.argv[1] && process.argv[1].endsWith("check-pex.mjs")) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error("check:pex —", error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
