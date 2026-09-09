import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Configuración de Prisma. Sustituye a `package.json#prisma`, deprecado en
 * Prisma 6.19 y eliminado en Prisma 7.
 *
 * Este archivo lo lee SÓLO el CLI de Prisma (`validate`, `generate`,
 * `migrate diff`, `db seed`), nunca la aplicación en ejecución.
 *
 * Con un config file, Prisma deja de cargar `.env` por su cuenta: por eso el
 * `import "dotenv/config"` de arriba. Si aun así no hay cadena de conexión
 * (clon recién bajado, CI sin secretos), se usa un marcador local para que
 * `prisma validate` y `prisma generate` funcionen sin conectarse a nada.
 * Cualquier comando que sí toque una base de datos fallará contra localhost
 * en vez de contra un servidor real, que es exactamente lo que se busca.
 */
process.env.DATABASE_URL ??= "postgresql://atlante:atlante@localhost:5432/atlante?schema=public";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
