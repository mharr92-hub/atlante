# Reglas comunes — se aplican a TODOS los bloques

Contexto: repo de **Atlante del Pacífico** (atlantedelpacifico.lat): Next.js 16 App Router + TypeScript + Tailwind v4 + Prisma 6 sobre Postgres (proyecto Supabase "ATLANTE"), desplegado en Vercel. Es un proyecto totalmente separado de Pacific Experience (PEX, pacificexperience.lat): no importes código de PEX, no toques su repo ni su base de datos, no compartas credenciales.

Antes de escribir código lee: `AGENTS.md` (Next.js 16 tiene cambios respecto a lo que conoces: consulta `node_modules/next/dist/docs/`), `docs/PRD-atlante-v2.md`, `docs/TODO-atlante-v2.md` y los reportes de bloques anteriores en `docs/reportes/`.

Reglas (no negociables):

1. Trabajas SOLO en la rama actual (`feature/atlante-broker`). Nunca hagas merge a `main`, nunca despliegues, nunca crees ni cambies variables en Vercel ni en Supabase. No ejecutes migraciones contra ninguna base de datos remota (`prisma migrate deploy` lo corre el script de Mark, no tú); sí puedes generar archivos de migración.
2. Commits en español, pequeños y descriptivos (`git add -A && git commit -m "..."`) al terminar cada sub-bloque. No hagas `git push` (lo hace el script).
3. No inventes datos. Precios, horarios, capacidades, políticas, comisiones, reseñas, métricas o textos legales que no estén en este prompt o en `docs/PRD-atlante-v2.md` no existen: van a la sección `PENDIENTE MARK` del reporte, nunca a la web.
4. Nunca uses la palabra "Sunset" en ningún texto (ES ni EN). Usa "atardecer" / "evening" / "dusk".
5. Atlante nunca cobra: prohibido cualquier formulario de tarjeta, SDK o ruta de pago. El pago ocurre en PEX o con el operador aliado.
6. Todo enlace a pacificexperience.lat se construye con `buildPexUrl()` de `src/lib/pex.ts`. Nunca escribas el dominio de PEX a mano fuera de ese archivo.
7. Nunca pongas nombre, correo ni teléfono en query strings, en URLs ni en logs.
8. No instales ni contrates servicios pagos. Puedes añadir dependencias npm gratuitas si son necesarias (justifícalo en el reporte).
9. Todo debe funcionar sin base de datos (`DATABASE_URL` ausente o DB caída) degradando con gracia: nunca bloquees la navegación ni el handoff a PEX porque la DB falle.
10. Al terminar el bloque `npm run lint` y `npm run build` deben pasar. Si algo falla, arréglalo antes de cerrar el bloque.
11. Escribe el reporte del bloque en `docs/reportes/bloque-XX.md`: qué hiciste (por archivo), qué no, `PENDIENTE MARK`, cómo probarlo. Haz commit del reporte.
12. Si una instrucción de este prompt contradice el PRD, manda el prompt. Si algo es ambiguo, elige la opción más simple, anótalo en el reporte y sigue. No te detengas a preguntar: no hay nadie mirando.
13. Idioma: ES por defecto y EN vía el diccionario existente (`src/lib/i18n.ts` + objetos `{ es, en }`). Todo texto nuevo va en ambos idiomas con el mismo mecanismo. Puedes usar tildes en los textos nuevos.
14. Mobile-first (390 px): tipografía legible al sol (nada de 12 px gris sobre claro), botones de 44 px mínimo, sin scroll horizontal.
15. Al final de cada bloque verifica con búsqueda de texto que en `src/` no aparezcan: `atlantedelpacifico.com`, `ATLANTE10`, `Pocos cupos`, `Sunset`, `127 reseñas`, ni valores de precio inventados (`850`, `1450`, `2800`, `1200`, `1800`, `3200` como precios).