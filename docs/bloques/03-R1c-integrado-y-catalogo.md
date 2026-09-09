# Bloque 3 — R1c · Modo integrado (feed + webhook) y catálogo administrable (P0 cuando PEX exponga X1–X5)

Objetivo: dejar lista la integración con PEX detrás de banderas, de modo que cuando la sesión de PEX publique el feed y el webhook (ver `docs/anexo-PEX.md`), Atlante pase de "modo puente" a "modo integrado" sin reescribir nada. Además, mover el catálogo a la base de datos con administración.

Todo lo de este bloque debe funcionar con el feed ausente: si `PEX_FEED_URL` no está definido o no responde, el sitio sigue en modo puente con el catálogo en código.

## 3.1 Feed de PEX (contrato esperado, especificado en `docs/anexo-PEX.md` X4)

- `GET {PEX_FEED_URL}/trips` → `[{ id, slug, kind, name, price_from, price_table[], duration_min, capacity_min, capacity_max, policies[], images[], path, available }]`
- `GET {PEX_FEED_URL}/slots?trip_id=&from=&to=` → `[{ id, trip_id, date, start, end, capacity_remaining, price }]`
- Crea `src/lib/pex-feed.ts` con un cliente tipado, timeout 5 s, cache en memoria 60 s, y fixtures en `tests/fixtures/pex-feed/*.json` para tests.

## 3.2 Sincronización → base de datos

- Modelos Prisma nuevos: `Product` (espejo del tipo del catálogo + `source`, `pexTripId`, `verifiedAt`, `sourceUrl`, `commissionPct`, `available`, `order`, `syncedAt`), `ProductAddon`, `ProductSlot { id, productId, pexSlotId @unique, date @db.Date, startTime, endTime, capacityRemaining, price, syncedAt }`. Migración `0003_catalog` con `prisma migrate diff` como en el bloque 2 (sin tocar DB remota).
- `src/lib/catalog.ts`: `getProducts()` / `getProduct(slug)` leen de la DB si hay `DATABASE_URL` y la tabla tiene filas; si no, caen al catálogo en código (`src/content/catalog.ts`). Las páginas públicas y el funnel usan SOLO `lib/catalog.ts` (nunca el archivo de contenido directamente).
- Seed: `prisma/seed.ts` inserta/actualiza (upsert por `slug`) el catálogo en código en `Product`/`ProductAddon` con `verifiedAt` y `sourceUrl`. Idempotente.
- `GET /api/cron/sync-pex` (protegido por `Authorization: Bearer ${CRON_SECRET}`): lee `/trips` y `/slots` (próximos 90 días), hace upsert en `Product`/`ProductSlot`, marca `syncedAt`, y si el feed falla deja el snapshot anterior intacto y responde `{ ok: false, reason }`. `vercel.json` con `crons: [{ path: "/api/cron/sync-pex", schedule: "*/15 * * * *" }]`.

## 3.3 Funnel en modo integrado

- Paso 2: si el producto tiene `ProductSlot` sincronizados (`syncedAt` < 24 h), el calendario habilita SOLO los días con slot y muestra horarios con cupos ("18 cupos"); valida `paxTotal <= capacityRemaining`; si no hay cupo, ofrece las 3 próximas fechas con cupo como botones. Si no hay slots, se comporta como en el bloque 2 (modo puente) y muestra el aviso.
- `POST /api/leads`: si el lead trae `slotId` válido, `destinationUrl` usa `buildPexUrl({ target: "tour_checkout", tripId: product.pexTripId, slotId, date, tickets: paxTotal, leadId, handoffToken, addons })`.
- Muestra "Modo: integrado" / "Modo: puente" solo en el admin, nunca en público.

## 3.4 Conciliación y comisiones

- El webhook del bloque 2 ya persiste `PexEvent`; aquí añade `/admin/comisiones`: por mes y por producto/operador: leads pagados, monto, `commissionPct`, comisión; export CSV. `ATLANTE_COMMISSION_PCT` por defecto 20 (PENDIENTE MARK) y `commissionPct` por producto en admin.
- Regla automática: cron diario (`/api/cron/leads-housekeeping`, mismo `CRON_SECRET`) que pasa a `lost` los leads `redirected` con más de 7 días sin `paid`.
- Notificación al concierge por cada lead nuevo: implementa `src/lib/notify.ts` con un proveedor "log" (consola) y una interfaz para email/WhatsApp; no contrates servicios (PENDIENTE MARK: Resend/Twilio u otro).

## 3.5 Admin de catálogo y verificación contra PEX

- `/admin/catalogo`: lista y edición de `Product` y `ProductAddon` (precio, disponibilidad, horario, textos ES/EN, `verifiedAt` con botón "Marcar verificado hoy", `commissionPct`). Aviso visible si `verifiedAt` > 14 días.
- `scripts/check-pex.mjs` (`npm run check:pex`): para cada producto con `sourceUrl`, descarga la página pública de PEX y compara el precio "desde" y la disponibilidad con el catálogo; imprime una tabla de diferencias y termina con exit 1 si hay alguna. Solo reporta, no corrige.

## 3.6 Verificación

- Tests: cliente del feed con fixtures, sync (mock de Prisma o test de integración condicionado a `TEST_DATABASE_URL`), firma del webhook (válida, inválida, timestamp viejo, duplicado), housekeeping.
- `npm run lint && npm run build && npm run test`. Reporte `docs/reportes/bloque-03.md` con la lista exacta de variables nuevas (`PEX_FEED_URL`, `CRON_SECRET`, `ATLANTE_COMMISSION_PCT`) y el estado "modo puente hasta que PEX publique X4/X5".