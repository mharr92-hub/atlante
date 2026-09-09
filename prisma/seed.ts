/**
 * Seed — `npm run db:seed`.
 *
 * Desde R1 no hay nada que sembrar: el catálogo vive en código
 * (`src/content/catalog.ts`) y los leads los crea el funnel. Se conserva el
 * script, idempotente y sin efectos, para no romper `prisma db seed` ni el
 * despliegue si alguien lo invoca.
 */
async function main() {
  console.log("catálogo en código; nada que sembrar");
}

main();
