# Bloque 6 — R4 · Crecimiento: destinos, EN completo, CI (P2)

Objetivo: SEO de broker (páginas de destino y comparación), sitio completo en inglés con `hreflang`, y CI que proteja lo construido. Contenido solo con datos del catálogo y de las naves; nada inventado sobre lugares (sin cifras, distancias ni tiempos que no estén ya en el repo).

## 6.1 Páginas de destino

- `/destinos/taboga`, `/destinos/las-perlas`, `/destinos/bahia`: "todas las formas de ir": para cada destino lista los productos del catálogo y las naves cuyas rutas lo incluyen (ferry, tour, party, charter) con precio real y CTA correspondiente (`/reservar/[slug]` o `/charters/[slug]`). Texto descriptivo breve (2–3 párrafos) escrito por ti, sin datos numéricos nuevos. JSON-LD `TouristDestination` sin rating.
- Enlaza desde el home (`Destinations.tsx`) y el footer; añade al sitemap.

## 6.2 Inglés completo + hreflang

- Revisa que TODO el sitio público tenga EN (catálogo, naves, funnel, legales, admin no). 
- Rutas `/en/*` mediante `middleware.ts` (reescritura por prefijo) o segmento `[locale]` — elige la opción más simple compatible con Next.js 16 y documéntala. `<link rel="alternate" hreflang="es" | "en" | "x-default">` en `metadata.alternates.languages` de cada página. Selector ES/EN del header navega entre las rutas equivalentes.
- `grep -ri sunset src/` sigue en 0.

## 6.3 CI

- `.github/workflows/ci.yml`: en cada push a ramas `feature/*` y en PRs a `main`: `npm ci`, `npm run lint`, `npm run test`, `npm run build` (con `DATABASE_URL` ficticia si el build lo exige), `npm run check:pex-links`. Añade Playwright e2e mínimo del funnel del tour bahía en modo puente (arranca `next start` y comprueba que `/reservar/tour-bahia` llega a `/listo` y que el enlace final contiene `ref=ATLANTE`). Lighthouse CI opcional (`@lhci/cli`, gratuito) con umbral 85 móvil en `/`, `/reservar/tour-bahia`, `/charters`; si falla por red en CI, déjalo como job no bloqueante.

## 6.4 Verificación

- `npm run lint && npm run build && npm run test`. Reporte `docs/reportes/bloque-06.md` con capturas o descripción de las 3 rutas clave a 390 px.