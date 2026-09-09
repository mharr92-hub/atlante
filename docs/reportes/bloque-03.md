# Bloque 3 — R1c · Modo integrado (feed + webhook) y catálogo administrable

Fecha: 2026-09-09 · Rama: `feature/atlante-broker` · Sin push, sin merge, sin deploy, sin tocar Vercel ni Supabase, sin ejecutar migraciones contra ninguna base de datos.

**Estado del bloque: modo puente hasta que PEX publique X4 (feed) y X5 (webhook).** Todo el modo integrado está escrito, probado y detrás de una bandera de datos: se enciende solo cuando `PEX_FEED_URL` exista y el cron llene `ProductSlot`. Sin feed, sin `CRON_SECRET` o sin base de datos, el sitio se comporta exactamente como al cerrar el bloque 2.

Commits del bloque (sobre `496e9ea`):

| SHA | Sub-bloque |
|---|---|
| `56fa5a6` | (corrida anterior) Cliente del feed, `lib/catalog`, `lib/slots`, `lib/sync-pex`, modelos Prisma, migración `0003_catalog`, seed y fixtures |
| `7cbaed8` | Catálogo desde `lib/catalog`, funnel en modo integrado y crones de sincronización |
| `080123d` | Admin de catálogo, reporte de comisiones y comisión por producto |
| `472e848` | `check:pex`, validación del webhook en `lib/` y tests de feed, sync, comisiones y housekeeping |
| (este) | Humo del bloque y reporte |

| Comprobación | Resultado |
|---|---|
| `npm run lint` | limpio (eslint + `check:pex-links`) |
| `npm run test` | **88/88** |
| `npm run build` | ✓ compila, 27 rutas + proxy |
| `npm run check:pex` | corre contra las páginas reales de PEX y sale con **exit 1** (3 diferencias, ver §5) |
| `npx prisma validate` | ✓ |

---

## 1. Variables de entorno nuevas

| Variable | Quién la usa | Sin ella |
|---|---|---|
| `PEX_FEED_URL` | `src/lib/pex-feed.ts` (`{base}/trips`, `{base}/slots`) y el cron de sincronización | `feedConfigured()` es `false`; `/api/cron/sync-pex` responde `{ ok: false, reason: "feed_not_configured" }` y **el sitio se queda en modo puente**. Es el estado de hoy |
| `CRON_SECRET` | `src/lib/cron.ts` → `/api/cron/sync-pex` y `/api/cron/leads-housekeeping` (`Authorization: Bearer …`) | Las dos rutas responden **503 `cron_not_configured`**. Nada más se ve afectado |
| `ATLANTE_COMMISSION_PCT` | Ya existía; ahora es el **respaldo** de `Product.commissionPct` | Se usa **20 %** (PENDIENTE MARK, ver §6) |

Las tres están documentadas en `.env.example`. `PEX_FEED_URL` es la única línea nueva del archivo; `CRON_SECRET` y `ATLANTE_COMMISSION_PCT` ya estaban y sólo se les amplió el comentario.

`vercel.json` (nuevo) declara los dos crones:

```json
{ "crons": [
  { "path": "/api/cron/sync-pex",            "schedule": "*/15 * * * *" },
  { "path": "/api/cron/leads-housekeeping",  "schedule": "20 7 * * *" }
]}
```

---

## 2. Qué se hizo, por archivo

### 2.1 Feed de PEX (3.1) — ya venía de la corrida anterior, más un arreglo

- **`src/lib/pex-feed.ts`** (existente): cliente tipado de `GET {PEX_FEED_URL}/trips` y `GET …/slots?trip_id=&from=&to=`, timeout de 5 s, caché en memoria de 60 s (`noCache` para el cron) y validación campo a campo — una entrada que no cumple el contrato se descarta en vez de contaminar el catálogo. Los errores salen como `PexFeedError` con un `reason` legible (`timeout`, `http_502`, `bad_json`, `feed_not_configured`).
- **`tests/fixtures/pex-feed/{trips,slots}.json`** (existentes): 5 trips (dos rotos a propósito) y 7 salidas (dos rotas).
- **`src/lib/sync-pex.ts`**: se añadió `priceUnitFor()` y el campo `priceUnit` a `ProductCreateFields` — el feed no publica la unidad de cobro y `Product.priceUnit` es obligatorio; el ferry se guarda `per_segment` y el resto `per_person`. **Arreglo de bug**: `{ ok: true, trips: trips.length, ...empty }` dejaba `trips` en 0 porque `empty` lo pisaba (TypeScript lo marcaba como TS2783). Ahora `empty` va primero.

### 2.2 Sincronización → base de datos (3.2)

- **`prisma/schema.prisma`** y **`prisma/migrations/0003_catalog/migration.sql`** (existentes): `Product`, `ProductAddon`, `ProductSlot` y `Lead.pexSlotId`. Todo aditivo, sin tocar ninguna tabla existente. **Verificado en esta sesión**: `prisma migrate diff --from-schema-datamodel <schema de b15756a> --to-schema-datamodel prisma/schema.prisma --script` produce exactamente el mismo SQL que el archivo de migración. Sin ejecutar contra ninguna base.
- **`prisma/seed.ts`** (existente): upsert idempotente del catálogo en código por `slug`. **Arreglo**: `Prisma` se importaba con `import type` y se usaba como valor (`Prisma.DbNull`), así que el seed no compilaba.
- **`src/lib/catalog.ts`** (existente, ampliado): `getProducts()` / `getProduct(slug)` leen de `Product` si hay `DATABASE_URL` y filas, y caen al catálogo en código si no. Nuevo en este bloque:
  - `getIntegrationStatus()` — modo "puente" / "integrado" por producto y global, sólo para el admin;
  - `productLabels()` — `slug` → nombre en español para las tablas y los CSV;
  - `commissionPctFor(slug)` — la comisión del producto, o `ATLANTE_COMMISSION_PCT`.
- **Las páginas públicas y el funnel ya no importan `src/content/catalog.ts`**: `src/app/(site)/page.tsx`, `/tours`, `/tours/[slug]`, `/charters`, `/reservar/[slug]`, `/reservar/[slug]/listo` y `src/app/sitemap.ts` pasaron a `lib/catalog.ts` (async). Los componentes de cliente (`ToursSection`, `ChartersSection`, `TicketsCatalog`, `VesselsCatalog`) reciben los productos **por prop** desde el servidor: `lib/catalog.ts` es `server-only` y no puede entrar al bundle del navegador. Del archivo de contenido sólo quedan importaciones de **tipos** (que se borran al compilar) más el respaldo que usa `lib/catalog.ts`.
- **`src/app/api/cron/sync-pex/route.ts`** (nuevo): implementa `SyncDb` con Prisma y llama a `syncPex()`. Protegido por `CRON_SECRET`. Reglas del bloque respetadas:
  - si `/trips` falla, **no escribe nada** y responde `{ ok: false, reason }` con 200 (un 5xx sólo generaría reintentos ruidosos);
  - si falla el `/slots` de un producto, ese producto conserva su snapshot y el resto sigue (`slotErrors`);
  - un feed sin fotos **no borra** las que ya había;
  - al terminar bien, invalida la caché en proceso del catálogo.

### 2.3 Funnel en modo integrado (3.3)

- **`src/app/(site)/reservar/[slug]/page.tsx`**: resuelve las salidas en el servidor (`getProductSlots`) y sólo se las pasa al funnel si el snapshot está fresco (`slotsAreFresh`: hay salidas y `syncedAt` < 24 h). Si no, la prop llega vacía y el funnel es el del bloque 2.
- **`src/components/funnel/Calendar.tsx`**: nueva prop `allowedDates`. Con ella, **sólo** los días con salida real se pueden pulsar y el calendario abre en el mes de la primera; sin ella, sigue mandando `schedule.weekdays` + `validFrom`.
- **`src/components/funnel/Funnel.tsx`**:
  - modo integrado = `slots.length > 0`;
  - el paso 2 lista los horarios del día elegido con sus cupos (**"18 cupos"**), deshabilita los que están en cero y guarda el `pexSlotId` en el parámetro `slot` de la URL;
  - valida `paxTotal <= capacityRemaining`: si no cabe, bloquea "Continuar" y ofrece **las 3 próximas fechas con cupo** como botones;
  - el aviso "La disponibilidad final se confirma en Pacific Experience" sale **sólo en modo puente**; en integrado se dice que los cupos vienen de la disponibilidad de PEX;
  - al enviar manda `slotId` a `POST /api/leads` y deja `mode` en el `sessionStorage` del handoff, que `/listo` usa para el evento `redirect_to_pex`.
- **`src/lib/destination.ts`** (nuevo): `pexDestination(product, { addons, leadId, handoffToken, slot, tickets })` es **la única** regla de decisión puente/integrado. Con salida real y `trip_id` conocido arma el deep link `tour_checkout` (`trip_id`, `slot_id`, `date`, `tickets`); sin `trip_id` se degrada a la página del producto (PEX aterrizaría en un checkout vacío); una nave siempre va a `charter_checkout`. Lo usan `lib/leads.ts` (servidor), el funnel cuando la API falla y `/listo` al recargar: antes esa lógica estaba duplicada en dos sitios.
- **`src/lib/leads.ts`**: `parseLeadInput` es ahora asíncrono, resuelve el `slotId` contra el snapshot (`resolveSlot`) y **con salida real manda el feed**: la fecha y la hora salen del slot, no del calendario del catálogo. Un `slotId` que ya no existe o sin cupo devuelve 400 con `field: "slot"`. Un `slotId` con el snapshot ausente o vencido **se ignora en silencio** y el lead sigue en modo puente: el handoff nunca se bloquea por la sincronización.
- **`src/lib/i18n.ts`**: claves nuevas `live_availability_note`, `slot_spots` ("{n} cupos"), `slot_full`, `no_capacity`, `next_dates_capacity` y `err_slot`, en ES y EN.
- **"Modo: integrado/puente" se muestra en `/admin` y en `/admin/catalogo`, y en ningún otro lado.** Verificado en el humo: la cadena `Modo:` no aparece en el HTML del home, de `/tours` ni de `/reservar`.

### 2.4 Conciliación, comisiones y avisos (3.4)

- **`src/lib/commissions.ts`** (nuevo, funciones puras): `monthBounds`, `recentMonths` y `summarizeCommissions`. **No recalcula la comisión**: suma la que quedó guardada en el lead cuando se marcó pagado, porque el porcentaje del producto puede haber cambiado después; el `%` que se muestra es el **efectivo** (comisión ÷ monto).
- **`src/app/admin/(dash)/comisiones/page.tsx`** y **`comisiones/export/route.ts`** (nuevos): selector de mes, tabla por producto/nave (leads pagados, monto, % efectivo, comisión) con fila de total, y export CSV con el mismo agrupado.
- **`src/lib/csv.ts`** (nuevo): BOM UTF-8, coma y CRLF en un solo sitio. El export de leads pasó a usarlo y ganó la columna `pex_slot_id`.
- **`src/app/api/cron/leads-housekeeping/route.ts`** + **`src/lib/housekeeping.ts`** (nuevos): cron diario que pasa a `lost` los leads `redirected` sin pago con más de 7 días. Sólo toca `redirected`; un `created` nunca llegó al handoff y un `paid` ya está conciliado. Si un lead no tiene `redirectedAt` (el aviso del navegador no llegó), manda `createdAt`.
- **`src/lib/notify.ts`** (nuevo): aviso al concierge por cada lead nuevo, con proveedor `log` (consola del servidor, gratis) y la interfaz `NotifyProvider` lista para email o WhatsApp. **Sin datos personales**: el aviso lleva producto, fecha, pax, total estimado y modo, nunca nombre, correo ni teléfono. `notifyNewLead()` traga cualquier error: el handoff manda.
- **Comisión por producto**: `markLeadPaidAction` (admin) y el webhook usan `commissionPctFor(slug)`; sólo cuando el producto no la fija se aplica `ATLANTE_COMMISSION_PCT`.

### 2.5 Admin de catálogo y verificación contra PEX (3.5)

- **`src/app/admin/(dash)/catalogo/page.tsx`** (nuevo): lista con nombre, tipo, precio desde, disponibilidad, `verifiedAt` con **aviso rojo a los 14 días**, comisión, número de salidas y el modo de cada producto. Botón "Marcar verificado hoy" en cada fila.
- **`src/app/admin/(dash)/catalogo/[slug]/page.tsx`** (nuevo): edición completa — textos ES/EN (nombre, resumen, descripción), precio y unidad, "desde por persona", comisión, capacidades, tabla de precios, horario (días, horas, `validFrom`, nota), duración, incluye / no incluye / políticas, imágenes, disponibilidad, `verifiedAt` y `sourceUrl`. Debajo, un formulario por adicional (nombre ES/EN, precio, unidad, duración, activo).
- **`src/app/admin/catalog-actions.ts`** (nuevo): `saveProductAction`, `markVerifiedTodayAction` y `saveAddonAction`, todas con `requireAdmin()`, todas invalidando la caché del catálogo y las rutas públicas afectadas (incluido `/sitemap.xml`).
- **`src/lib/catalog-forms.ts`** (nuevo): el parseo de los campos JSON como texto — horarios `17:30-19:00, 20:00-21:30`, tabla de precios `key | etiqueta ES | etiqueta EN | precio`, listas bilingües emparejadas por línea. Está fuera de la página **porque un horario mal parseado se lleva el funnel por delante**: tiene 14 casos de prueba.
- **`src/app/globals.css`**: bloque nuevo para los formularios del admin (rejilla, checkboxes de 44 px, aviso `admin-warn`) y para los cupos por salida del funnel.
- **`scripts/check-pex.mjs`** + **`npm run check:pex`** (nuevos): descarga la página pública de PEX de cada producto con `sourceUrl` y compara el precio "desde" y la disponibilidad. Imprime la tabla de diferencias y sale con **exit 1** si hay alguna. **Sólo reporta**: no escribe en la base ni en el catálogo. Lee el catálogo de la tabla `Product` si hay `DATABASE_URL`, y del código si no.

### 2.6 Webhook (3.6)

- **`src/lib/pex-webhook.ts`** (nuevo): `verifyWebhook` (firma HMAC-SHA256 sobre `${timestamp}.${body}` con `timingSafeEqual`, ventana de ±5 min), `parseWebhookBody`, `isDuplicateEvent` (P2002), `signWebhook`, `commissionFor` e `isRevertEvent`. Se extrajo de la ruta **para poder probarlo**: la ruta importa `next/server` y `server-only`, que no se pueden cargar en el runner de tests de Node.
- **`src/app/api/pex/booking-confirmed/route.ts`**: mismo comportamiento externo que en el bloque 2 (503 sin secreto, 400 por timestamp viejo, 401 por firma mala, 200 `{ duplicate: true }` en reenvíos), ahora sobre esas funciones y con la comisión del producto.

---

## 3. Tests

`npm run test` pasó de 19 a **88 casos** (`node --test tests/*.test.ts`). Los nuevos:

| Archivo | Casos | Qué asegura |
|---|---|---|
| `tests/pex-feed.test.ts` | 10 | Las entradas rotas del fixture se descartan (5 trips → 3, 7 salidas → 5); sin `PEX_FEED_URL` no se llama a nadie; la query de `/slots` se arma bien; la caché de 60 s ahorra la segunda llamada y `noCache` la fuerza; 500, JSON roto y aborto se traducen a `http_500`, `bad_json` y `timeout` |
| `tests/sync-pex.test.ts` | 8 | Ventana de 90 días; `key` estable a partir de la etiqueta; corrida completa (3 productos, 5 salidas); un producto existente se actualiza en vez de duplicarse; **si `/trips` falla no se escribe absolutamente nada**; si falla el `/slots` de un producto, sus salidas **no se borran** |
| `tests/webhook.test.ts` | 12 | Firma válida, firma inválida, cuerpo alterado con firma buena, sin cabecera de firma, timestamp de hace 10 min, timestamp futuro, timestamp no numérico, sin secreto, cuerpo incompleto, reenvío duplicado (P2002), eventos de reversión y redondeo de la comisión |
| `tests/slots.test.ts` | 8 | Frescura del snapshot (24 h); días con salida vs. días con cupo; cupo del día; 3 próximas fechas con cupo; primera fecha utilizable |
| `tests/destination.test.ts` | 6 | Puente → página del producto; integrado → `/tours/checkout` con `trip_id`, `slot_id`, `date`, `tickets`, `h`; **con salida pero sin `trip_id` se degrada**; una nave siempre va a su checkout; add-ons uno por parámetro; las cuatro URLs llevan `ref=ATLANTE` y ninguna lleva datos personales |
| `tests/commissions.test.ts` | 9 | Rango del mes en UTC (incluido diciembre → enero); mes inválido cae al actual; agrupado y orden; % efectivo; monto 0 no inventa porcentaje |
| `tests/housekeeping.test.ts` | 3 | Corte de 7 días; el cron pasa ese corte; si la base falla no se pierde nada |
| `tests/catalog-forms.test.ts` | 13 | Horarios, días, tabla de precios y listas bilingües van y vuelven sin perder nada; lo que no parsea se descarta en vez de guardarse a medias |

**Sync contra base de datos real**: no hay test de integración con `TEST_DATABASE_URL`. El bloque lo daba como alternativa ("mock de Prisma **o** test de integración condicionado") y en esta máquina no hay Postgres propio; se hizo el doble de `SyncDb`, que es lo que permite probar la regla del snapshot intacto.

---

## 4. Qué no se hizo

- **No se ejecutó ninguna migración.** `0003_catalog` está escrita y verificada contra el esquema (§2.2), pero no se aplicó a ninguna base: no hay Postgres propio en esta máquina y la regla 1 prohíbe correrla contra la remota. `npm run db:seed` tampoco se corrió.
- **El modo integrado no se probó de punta a punta con datos reales**, por lo mismo: hace falta base de datos *y* feed de PEX, y hoy no existe ninguno de los dos. Lo que sí está probado es toda la lógica que lo decide (69 casos nuevos) y que **sin feed todo cae en modo puente** (humo del §8).
- **No se tocó PEX** ni se implementó nada de X1–X9.
- **No se creó `/admin/naves` ni `/admin/operadores`**: son del bloque 4.
- **No se instaló ninguna dependencia.** El bloque no necesitó ninguna: el cliente del feed usa `fetch`, el cron usa `node:crypto` y los tests el runner de Node.
- **`check:pex` no corrige nada.** Es lo que pide el bloque; la corrección se hace a mano en `/admin/catalogo`.
- **Los adicionales no se crean ni se borran desde el admin**, sólo se editan. Crearlos requiere decidir `slug` y unidad, que son datos de PEX: entran por `src/content/catalog.ts` + seed, o por el feed.

---

## 5. Decisiones tomadas por ambigüedad (regla 12)

1. **El cron responde 200 con `{ ok: false, reason }`**, no 5xx. El bloque pide ese cuerpo; devolverlo con un código de error haría que Vercel reintentara cada 15 minutos contra un feed que sabemos que no existe.
2. **`slotId` con snapshot ausente o vencido se ignora, no falla.** Si `POST /api/leads` rechazara el lead porque la sincronización se atrasó, la regla 9 quedaría rota. Sólo se rechaza (400 `slot`) cuando el snapshot **sí** está fresco y la salida ya no existe o no tiene cupo — ahí el error es real y el cliente puede elegir otra.
3. **Con salida real, el calendario habilita todos los días con salida**, tengan cupo o no; el filtro por cupo se aplica al horario y a las 3 fechas alternativas. Es lo que dice el bloque ("habilita SOLO los días con slot" + "valida `paxTotal <= capacityRemaining`") y evita un calendario que cambia de forma al mover el contador de pasajeros.
4. **El parámetro `slot` de la URL guarda el `pexSlotId` en modo integrado y la hora en modo puente.** Un parámetro nuevo habría duplicado estado; el que consume la URL siempre sabe en qué modo está.
5. **El `%` de `/admin/comisiones` es el efectivo (comisión ÷ monto), no `commissionPct`.** Si Mark cambia la comisión de un producto, los meses ya cerrados tienen que seguir cuadrando con lo que se facturó.
6. **`priceUnit` de un producto creado por el feed**: `per_segment` para el ferry, `per_person` para el resto. El feed no publica la unidad y la columna es obligatoria; es la unidad con la que PEX vende hoy cada tipo, y se puede corregir en `/admin/catalogo`.
7. **Los textos que llegan del feed se guardan iguales en ES y EN.** El feed es monolingüe y **no se inventan traducciones** (regla 3): Mark las escribe en el admin.
8. **El feed no pisa las fotos con una lista vacía.** Un feed sin `images` borraría las que ya hubiera; sólo suma.
9. **`destinationFor` se movió a `src/lib/destination.ts`.** La misma decisión puente/integrado estaba duplicada en `lib/leads.ts` y en `lib/handoff-storage.ts`, y la de `leads.ts` no se podía probar (`server-only`). Ahora hay una sola función y seis casos de prueba.
10. **La validación del webhook se movió a `src/lib/pex-webhook.ts`** por lo mismo: el bloque exige tests de firma y la ruta no es importable desde el runner de Node.
11. **El cron de housekeeping corre a las 07:20 UTC** (02:20 en Panamá), fuera de la hora de compra. El bloque sólo pide "diario".
12. **Los tests importan con el alias `@/`** (comprobado: `tsx` resuelve los `paths` del `tsconfig.json`), en vez de las rutas relativas del bloque 2. Los dos archivos viejos se dejaron como estaban.
13. **`scripts/smoke-bloque3.mjs`** (nuevo) queda en el repo: es el humo del §8, no entra en `lint`, `build` ni `test`.

---

## 6. `npm run check:pex` — lo que dice hoy

Corrido en esta sesión contra las páginas reales de PEX, con el catálogo en código (no hay `DATABASE_URL`):

```
  ✔ tour-bahia                 $25 · disponible
  ✖ party-bahia                1 diferencia(s)
  ✖ ferry-taboga               1 diferencia(s)
  ✖ ferry-contadora            1 diferencia(s)
  ✔ charter-aura               $1300 · disponible
  ✔ charter-pacific-ferry-1    $1300 · disponible
  ✔ charter-sirena-del-mar     $1300 · disponible
```

| Producto | Diferencia | Lectura |
|---|---|---|
| `party-bahia` | "la página no publica ningún precio visible en el HTML" | **Falso positivo conocido**: esa ficha de PEX pinta el precio en el cliente, así que el HTML que llega no lo trae. El script no ejecuta JavaScript (no se instaló ningún navegador headless: regla 8). Cuando exista el feed X4 esta comparación deja de hacer falta |
| `ferry-taboga` | "el catálogo lo marca no disponible y la página no lo dice" | **Diferencia real y esperada**: el ferry está `available: false` por decisión de Mark (en agosto quedó "pausado hasta nuevo aviso") mientras la web de PEX lo sigue vendiendo. Es el PENDIENTE MARK #3 del bloque 2 |
| `ferry-contadora` | igual | Contadora está `available: false` porque PEX la muestra como no disponible; el marcador no aparece en el HTML estático por el mismo motivo que el Party |

Los tres son informativos, no bugs. El script cumple lo que pide el bloque: reporta y sale con 1.

---

## 7. PENDIENTE MARK

| # | Tema | Detalle y qué hay que decidir |
|---|---|---|
| 1 | **`PEX_FEED_URL`** | No existe hasta que la sesión de PEX implemente X4. Cuando exista: cargarla en Vercel (Atlante) **sin barra final** y comprobar `GET {base}/trips` a mano antes de encender el cron. Sin ella todo sigue en modo puente, que es el estado de hoy |
| 2 | **`CRON_SECRET`** | Hay que generarlo (32+ caracteres aleatorios) y cargarlo en Vercel. Sin él los dos crones responden 503. Vercel lo manda solo como `Authorization: Bearer` a las rutas de `vercel.json` |
| 3 | **`ATLANTE_COMMISSION_PCT` = 20** | Sigue siendo el valor por defecto propuesto (igual al B2B de PEX). Ahora se puede fijar **por producto** en `/admin/catalogo`; la variable sólo actúa de respaldo. Confirmar el número y si es igual para tours, ferry y charters |
| 4 | **Proveedor de aviso al concierge** | `src/lib/notify.ts` sólo escribe en la consola del servidor. Para email o WhatsApp hay que contratar un servicio (Resend, Twilio u otro) — la regla 8 prohíbe hacerlo sin tu ok. La interfaz ya está: es un archivo nuevo de ~20 líneas cuando decidas |
| 5 | **`trip_id` del Tour por la Bahía** | Sigue en `null`. **Es lo único que separa al tour del deep link al checkout**: con salidas sincronizadas y sin `trip_id`, el handoff se degrada a `/ferry/bahia`. Rellenarlo en `src/content/catalog.ts` (o en la base) enciende el modo integrado para ese producto sin tocar código |
| 6 | **`trip_id` del Party** | Se sigue usando `c0d1a003-0000-4000-8000-000000000085`, deducido de la URL. Confirmar que el checkout de PEX lo acepta como `trip_id` |
| 7 | **Aplicar las migraciones** | `0001_init`, `0002_broker_v2` y `0003_catalog` están escritas y **no ejecutadas**. Antes de `prisma migrate deploy` hay que restaurar el proyecto Supabase "ATLANTE" (estaba pausado). `0003` es puramente aditivo: no toca ninguna tabla existente |
| 8 | **Sembrar el catálogo** | Después de migrar, `npm run db:seed` copia los 7 productos y sus adicionales a `Product`/`ProductAddon`. Es idempotente. **Hasta que se corra, `/admin/catalogo` no puede editar nada** (el sitio se sirve del catálogo en código) |
| 9 | **Estado del Ferry a Taboga** | Sigue `available: false` y `check:pex` lo señala cada vez. Decidir: activarlo o dejarlo pausado |
| 10 | **Unidad del add-on de Contadora** | Sigue `unit: "pending"` y no suma al estimado. Ahora se puede cambiar desde `/admin/catalogo` sin desplegar |
| 11 | **Fotos reales** | Los 7 productos siguen con `/og-atlante.jpg`. Se pueden cargar desde `/admin/catalogo` (una ruta por línea) en cuanto los archivos estén en `public/` |
| 12 | **Precio del Party en `check:pex`** | Si quieres que el script deje de dar ese falso positivo antes de que exista el feed, hace falta un navegador headless (Playwright) — es una dependencia gratuita pero pesada; no se instaló |

---

## 8. Cómo probarlo

```bash
npm install
npm run lint     # eslint + check:pex-links
npm run test     # 88 casos
npm run build
npm run check:pex   # red: compara contra las páginas de PEX; hoy sale con exit 1
npx prisma validate
```

### Humo sin base de datos (corrido en esta sesión)

Con `npm run dev` en el puerto 3005, `CRON_SECRET` y `PEX_WEBHOOK_SECRET` en `.env.local` (borrado después) y **sin `DATABASE_URL` ni `PEX_FEED_URL`**:

```bash
node --env-file=.env.local scripts/smoke-bloque3.mjs http://localhost:3005
```

| Comprobación | Resultado |
|---|---|
| `/`, `/tours`, `/tours/tour-bahia`, `/charters`, `/reservar/tour-bahia`, `/reservar/tour-bahia/listo`, `/sitemap.xml`, `/robots.txt` | **200** |
| `/tours/ferry-taboga` (producto que PEX no vende) | **404** |
| `/admin`, `/admin/catalogo`, `/admin/comisiones`, `/admin/comisiones/export` sin cookie | **307** al login |
| `GET /api/cron/sync-pex` sin `Authorization` | **401** `{"ok":false,"reason":"unauthorized"}` |
| `GET /api/cron/sync-pex` con secreto incorrecto | **401** |
| `GET /api/cron/sync-pex` autorizado, sin feed | **200** `{"ok":false,"reason":"feed_not_configured"}` |
| `GET /api/cron/leads-housekeeping` autorizado, sin DB | **200** `{"ok":false,"reason":"no_database"}` |
| `POST /api/pex/booking-confirmed` con firma válida (sin DB) | **503** `no_database` |
| `POST` con firma inválida | **401** `bad_signature` |
| `POST` con timestamp de hace 10 min | **400** `stale_timestamp` |
| `POST /api/leads` con `slotId` y sin snapshot | **200**, `destinationUrl` = `…/ferry/bahia?ref=ATLANTE&utm_source=atlante&utm_medium=referral&utm_campaign=tour-bahia`, total $50 — **el slot se ignora y el handoff sigue** |
| El paso 2 avisa "La disponibilidad final se confirma…" y no publica cupos | sí (modo puente) |
| `Modo:` no aparece en el HTML del home, `/tours` ni `/reservar` | sí |
| `/tours` lista Tour por la Bahía y Party, y no el ferry pausado | sí |

### Verificación de la regla 15

| Búsqueda en `src/` | Resultado |
|---|---|
| `atlantedelpacifico.com` | **0** |
| `ATLANTE10` | **0** |
| `Pocos cupos` | **0** |
| `sunset` (sin distinguir mayúsculas) | **0** |
| `127 rese` / `aggregateRating` | **0** |
| `850 / 1450 / 2800 / 1200 / 1800 / 3200` como precio | **0** (`1200` sólo como ancho de la imagen OG en `layout.tsx` y en la ficha, igual que en el bloque 2) |
| `stripe / paguelo / yappy / card_number` | **0** |
| `pacificexperience.lat` fuera de `lib/pex.ts` y `content/catalog.ts` | **0** |

### Lo que falta probar (necesita base de datos)

Con un Postgres **local** (nunca el remoto):

```bash
# .env.local → DATABASE_URL y DIRECT_URL apuntando a una base local vacía
npx prisma migrate deploy
npm run db:seed                     # idempotente: se puede correr dos veces
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script    # debe salir vacío
```

Y sobre esa base:

1. **Catálogo desde la base**: `/tours` y `/admin/catalogo` deben mostrar los 7 productos; `/admin/catalogo` debe decir "fuente del catálogo: base de datos".
2. **Edición**: cambiar el precio de `tour-bahia` a $26 en el admin y comprobar que `/tours`, la ficha y el paso 3 del funnel lo reflejan **sin desplegar**; "Marcar verificado hoy" pone `verifiedAt` en la fecha de hoy y apaga el aviso de los 14 días.
3. **Aviso de verificación**: poner `verifiedAt` a 20 días atrás y comprobar que aparece el aviso rojo en la lista y en la ficha del admin.
4. **Modo integrado**: insertar a mano dos `ProductSlot` de `tour-bahia` (uno con 18 cupos y otro con 2, `syncedAt = now()`) y abrir `/reservar/tour-bahia?step=2`. Deben habilitarse **sólo** esos días, verse "18 cupos" y "2 cupos", y con 5 pasajeros el horario de 2 debe bloquear "Continuar" y ofrecer las próximas fechas con cupo.
5. **Deep link**: con `pexTripId` puesto y un slot elegido, el `destinationUrl` del lead debe ser `…/tours/checkout?trip_id=…&slot_id=…&date=…&tickets=…&ref=ATLANTE&ref_id=…&h=…`.
6. **Cron de sincronización**: levantar un feed de mentira (`node --test` no sirve aquí; vale un `python -m http.server` sirviendo los fixtures como `/trips` y `/slots`), apuntar `PEX_FEED_URL` a él y llamar `GET /api/cron/sync-pex` con el `Bearer`. Debe responder `{ ok: true, trips: 3, products: 3, slots: 5 }`. Apagar el feed y repetir: debe responder `{ ok: false, reason }` **sin borrar** las filas de `ProductSlot`.
7. **Webhook**: con `PEX_WEBHOOK_SECRET`, un `booking.paid` firmado con `ref_id` de un lead existente lo deja en `paid` con la comisión del producto; el mismo evento repetido responde `{ ok: true, duplicate: true }`.
8. **Comisiones**: ese lead debe aparecer en `/admin/comisiones` del mes correspondiente y en su CSV, con el % efectivo correcto.
9. **Housekeeping**: crear un lead `redirected` con `redirectedAt` de hace 8 días y llamar `GET /api/cron/leads-housekeeping` con el `Bearer`: debe responder `{ ok: true, lost: 1 }` y el lead debe quedar en `lost`.
10. **Aviso al concierge**: al completar el paso 3, la consola del servidor debe traer una línea `[notify] lead <id> · <producto> · … · modo puente` **sin nombre, correo ni teléfono**.
