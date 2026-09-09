#!/usr/bin/env node
/**
 * Guardarraíl del principio 2: el dominio de Pacific Experience sólo puede
 * escribirse en `src/lib/pex.ts` (que construye TODOS los enlaces) y en
 * `src/content/catalog.ts` / `src/content/vessels.ts` (donde es el dato
 * `sourceUrl`, no un `href`).
 *
 * Cualquier otro `href` a mano se salta `buildPexUrl()` y pierde `ref=ATLANTE`,
 * que es la comisión. Por eso esto falla con exit 1 y corre dentro de `lint`.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const NEEDLE = "pacificexperience.lat";

const ALLOWED = new Set([
  "src/lib/pex.ts",
  "src/content/catalog.ts",
  "src/content/vessels.ts",
]);
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json", ".md"]);

/** Ruta relativa a la raíz, siempre con "/" (el script corre en Windows). */
function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

const offenders = [];
for await (const file of walk(SRC)) {
  const relative = rel(file);
  if (ALLOWED.has(relative)) continue;
  const content = await readFile(file, "utf8");
  content.split(/\r?\n/).forEach((line, i) => {
    if (line.includes(NEEDLE)) offenders.push(`${relative}:${i + 1}: ${line.trim()}`);
  });
}

if (offenders.length > 0) {
  console.error(
    `\n✖ ${NEEDLE} fuera de ${[...ALLOWED].join(" y ")}.\n` +
      "  Todo enlace a Pacific Experience se construye con buildPexUrl() de src/lib/pex.ts.\n",
  );
  for (const line of offenders) console.error(`  ${line}`);
  console.error("");
  process.exit(1);
}

console.log(`✔ check:pex-links — ningún ${NEEDLE} fuera de ${[...ALLOWED].join(" y ")}`);
