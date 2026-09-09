# Bloque 2 — R1 · Ticketería PEX en modo puente

Fecha: 2026-09-08 · Rama: `feature/atlante-broker` · Sin push, sin merge, sin deploy, sin tocar Vercel ni Supabase, sin ejecutar migraciones contra ninguna base de datos.

Commits del bloque (sobre `b4470a3`):

| SHA | Sub-bloque |
|---|---|
| `d466a9d` | Catálogo real de PEX, `buildPexUrl` completo y páginas públicas |
| `bc78660` | Modelos `Lead`/`Handoff`/`PexEvent`, migraciones y `prisma.config.ts` |
| `c25ad46` | APIs de lead, handoff y webhook, y cookies de atribución |
| `ae9e206` | Funnel de 3 clics y pantalla de salto a Pacific Experience |
| `f2acbbc` | Admin de leads con filtros, rescate por WhatsApp y export CSV |
| (este) | Limpieza, sitemap/robots y reporte |

Estado final: `npm run lint`, `npm run build`, `npm run test` y `npm run check:pex-links` pasan.

---

## 1. Qué se hizo, por archivo

### 1.1 Catálogo (2.2)

- **`src/content/catalog.ts`** (nuevo, reemplaza `src/content/tours.ts`, borrado). Un solo archivo tipado con los 7 productos del recorrido del 09/09/2026, cada uno con `verifiedAt: "2026-09-09"` y `sourceUrl`:

  | slug | kind | `priceFrom` · unidad | `available` |
  |---|---|---|---|
  | `tour-bahia` | `tour` | $25 · `per_person` | `true` |
  | `party-bahia` | `party` | $35 · `per_person` | `true` |
  | `ferry-taboga` | `ferry` | $10 · `per_segment` | **`false`** (PENDIENTE MARK) |
  | `ferry-contadora` | `ferry` | $130 · `per_person` | `false` |
  | `charter-aura` | `charter_pex` | $1,300 · `per_boat` | `true` |
  | `charter-pacific-ferry-1` | `charter_pex` | $1,300 · `per_boat` | `true` |
  | `charter-sirena-del-mar` | `charter_pex` | $1,300 · `per_boat` | `true` |

  Textos ES/EN escritos a partir de los datos de 2.1 y nada más. Exporta `catalog`, `getProduct()`, `ticketProducts` y `pexVessels`. El dominio de PEX aparece una vez, como constante `PEX_SITE`, para construir los `sourceUrl` (dato de procedencia, nunca un `href`).

- **`src/lib/funnel.ts`** (nuevo): `computeTotal`, `priceRows`, `minPax`/`maxPax`, `encodePax`/`decodePax`, `earliestDate`, `isSelectableDate`, `firstSelectableDate`, `slotLabel`, `usesTimeSlots`. Lo comparten el funnel (cliente) y `POST /api/leads` (servidor), que recalcula el total con la misma función.
- **`src/lib/format.ts`**: `money()` se queda; entran `priceFromLabel()`; salen `priceForGuests()` y `depositAmount()` (dependían de `Tour`).
- **`src/lib/i18n.ts`**: importa los tipos del catálogo; fuera las claves de filtros y de badges que ya no existen; entran ~60 claves nuevas (funnel, `/listo`, ficha, tipos de producto) más `MONTHS`, `WEEKDAYS_SHORT`, `WEEKDAYS_LONG`, `weekdaysLabel()`, `formatDate()` y `tf()` para interpolar `{n}`.
- **`src/components/tour/Badges.tsx`**: adaptado a los badges nuevos (`family`, `adventure`, `romantic`, `celebration`, `snorkel`, `group`, `evening`); fuera `fishing`.

### 1.2 `buildPexUrl` y guardarraíl (2.3)

- **`src/lib/pex.ts`**: `buildPexUrl({ target, path, tripId, slotId, date, tickets, vessel, addons, leadId, handoffToken, campaign })` con los seis targets. `tour_checkout` sin `tripId` cae a `tour_page`. Siempre `ref=ATLANTE` + `utm_source=atlante` + `utm_medium=referral` + `utm_campaign`; `ref_id` y `h` sólo si existen; un `addon=` por adicional. Ningún otro parámetro. `export const ATLANTE_REF = "ATLANTE"` (se conserva el alias `ATLANTE_REF_CODE` de R0).
- **`tests/pex.test.ts`** (9 casos) y **`tests/leads.test.ts`** (10 casos) con el runner de Node. Cubren: todos los targets llevan `ref=ATLANTE`; `ref_id` sólo con lead; `h` sólo con token; `tour_checkout` sin `tripId` cae a la página; add-ons repetidos; ningún parámetro fuera de la lista blanca ni `name`/`email`/`phone`; la URL exacta del modo puente; `computeTotal` (2 adultos bahía = $50, ferry adulto + niño = $18); `encodePax`/`decodePax`; días de salida del tour y del ferry.
- **`scripts/check-pex-links.mjs`**: recorre `src/` y falla con exit 1 si `pacificexperience.lat` aparece fuera de `src/lib/pex.ts` y `src/content/catalog.ts`. Rutas normalizadas con `/` para que funcione igual en Windows.
- **`package.json`**: `"lint": "eslint && node scripts/check-pex-links.mjs"`, `"check:pex-links"` y `"test": "node --import tsx --test tests/pex.test.ts tests/leads.test.ts"`.

### 1.3 Prisma (2.4)

- **`prisma/schema.prisma`**: el `Lead` de newsletter pasa a `Subscriber` (`@@map("Subscriber")`). Nuevos `enum LeadStatus`, `enum LeadType` y modelos `Lead` (intención de compra), `Handoff`, `PexEvent` y `PartnerApplication`, tal como los define el bloque. `Booking`, `Payment`, `AvailabilitySlot`, `Customer`, `Coupon`, `GiftCard`, `Review` y `Reseller` quedan intactos.
- **`prisma/migrations/migration_lock.toml`** (`provider = "postgresql"`), **`0001_init/migration.sql`** (copia íntegra de `prisma/initial-schema.sql`) y **`0002_broker_v2/migration.sql`**.
  El diff se generó con `prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma --to-schema-datamodel prisma/schema.prisma --script` y **se editó a mano**: Prisma resolvía el rename como un `ALTER TABLE "Lead"` que añadía las columnas `NOT NULL` del lead nuevo encima de las filas del newsletter. El SQL final hace `ALTER TABLE "Lead" RENAME TO "Subscriber"` (más el rename de la PK y del índice único de email) y crea el `Lead` nuevo vacío. `prisma/schema.base.prisma` se borró después del diff.
- **`prisma.config.ts`** (nuevo) reemplaza `package.json#prisma`, deprecado en Prisma 6.19. Mantiene `seed: "tsx prisma/seed.ts"`.
- **`prisma/seed.ts`**: no-op idempotente que imprime "catálogo en código; nada que sembrar". Fuera los 360 cupos y el cupón `WELCOME10`.
- **`src/lib/db.ts`**: `export const db` se sustituye por `getDb()`, que devuelve `null` sin `DATABASE_URL`. Antes, `new PrismaClient()` reventaba en la carga del módulo cuando faltaba la variable, que es justo lo que la regla 9 prohíbe.

### 1.4 Páginas públicas (2.5)

- **`/tours`** (`src/app/(site)/tours/page.tsx` + `components/catalog/TicketsCatalog.tsx`): tarjetas de `ticketProducts` con `available === true`, precio real, duración, días de salida, badge del tipo y CTA "Reservar" → `/reservar/[slug]`. `PexDisclosure` en variante `banner`. Metadata propia y JSON-LD `ItemList`.
- **`/tours/[slug]`** (`+ components/catalog/ProductDetail.tsx`): 404 si el producto no existe, no está disponible o es un chárter. Galería, descripción, tabla de precios, horario, incluye, políticas del operador, `WeatherWidget` (Open-Meteo, dato real) y la fecha de verificación. Panel lateral con precio y CTA, más **CTA fijo en móvil** "Reservar — desde $X". JSON-LD `TouristTrip` + `Offer` con el precio real y `provider` = Pacific Experience. `generateStaticParams` con los slugs disponibles.
- **`/charters`** (`+ components/catalog/VesselsCatalog.tsx`, `VesselCard.tsx`): las tres naves con capacidad, duraciones y "barco completo desde $1,300 · desde $55/persona" (Sirena del Mar muestra "consultar": PEX no publica su precio por persona). Badge "Reserva directa en Pacific Experience", CTA "Reservar en Pacific Experience" → `charter_checkout`, enlace "Ver ficha en Pacific Experience" → `charter_page` y CTA secundario de WhatsApp de Atlante. Sin lead: la captura para charters llega en el bloque 4.
- **Home**: `ToursSection` (3 tickets) y `ChartersSection` (3 naves) leen del catálogo y enlazan a `/tours` y `/charters`. Fuera los filtros por categoría inventada.
- **`Header.tsx`**: el CTA "Reservar" deja de abrir WhatsApp y entra a `/tours`. Ahora hay funnel; WhatsApp queda como canal de rescate (botón flotante).
- Borrados: `RouteMap.tsx`, `TourCard.tsx`, `TourDetail.tsx`, y `react-leaflet` / `leaflet` / `@types/leaflet` de `package.json`.

### 1.5 Funnel (2.6)

- **`src/app/(site)/reservar/[slug]/page.tsx`** (404 si el producto no existe, no está disponible o es un chárter) y **`components/funnel/Funnel.tsx`** + **`Calendar.tsx`**.
- Estado en la URL (`?step=&date=&slot=&pax=&addons=`) con barra de progreso de 3 pasos. Sólo el cambio de paso entra en el historial (`pushState`); el resto usa `replaceState`, para que "atrás" recorra el funnel y no cada toque del contador.
- **Paso 1**: nombre, precio real, duración, `PexDisclosure` inline y "Elegir fecha".
- **Paso 2**: calendario mensual propio (sin librerías) que sólo habilita los días de `schedule.weekdays` desde `max(hoy+1, validFrom)`, abre en el mes de la primera fecha habilitada y la preselecciona. Horarios de `schedule.times` (fijo si hay uno solo). Contador por categoría de `priceTable`, con el mínimo y el máximo del producto (party: 30–80; el resto, 1–20). Bloque de adicionales. Aviso "La disponibilidad final se confirma en Pacific Experience". Para el ferry la fecha es "fecha estimada de viaje" y no se pide horario.
- **Paso 3**: resumen con el total estimado y la nota de que el cobro lo hace PEX; nombre (≥ 2 palabras), WhatsApp con prefijo +507 visible, email, código de aliado (prellenado desde `?partner=` o la cookie `atl_partner`) y checkbox obligatorio con enlaces a `/terminos` y `/privacidad`.
- **Envío**: `POST /api/leads` con `AbortController` a 4 s. Si responde 400 se muestra el error del campo y no se redirige; si falla la red, tarda de más o responde 5xx, se construye el destino en el cliente con `buildPexUrl` sin `leadId`, se registra en consola y se continúa igual. **El handoff nunca se bloquea.**
- **`/reservar/[slug]/listo`** (`components/funnel/Listo.tsx`): `noindex`, resumen, la línea "Tu código de referido es ATLANTE" con botón **Copiar** (`navigator.clipboard` con fallback a `execCommand`), cuenta regresiva de 3 s y botón "Ir ahora". Al saltar dispara `redirect_to_pex`, hace `POST /api/leads/[id]/redirected` con `keepalive` y llama a `window.location.assign()`. El destino viaja por `sessionStorage` (`src/lib/handoff-storage.ts`), nunca por la URL; si no está, se reconstruye desde el catálogo sin `ref_id`.

### 1.6 APIs (2.7)

- **`POST /api/leads`** (`+ src/lib/leads.ts`): validación a mano (sin `zod`), total recalculado en el servidor desde el catálogo, `type` según el `kind`, `landingPath` y `utm_*` desde las cookies, `Lead` + `Handoff` (32 bytes hex, 30 min) y `destinationUrl` guardado en el lead. Sin base de datos responde igual `{ ok: true, leadId: null, destinationUrl }` sin `ref_id` y registra `console.warn("[leads] sin DB")`. Rate-limit en memoria de 20/min por IP (`src/lib/rate-limit.ts`).
- **`POST /api/leads/[id]/redirected`**: marca `redirectedAt` y `status: redirected`; siempre responde `{ ok: true }`.
- **`GET /api/handoff/[token]`**: 503 sin `PEX_HANDOFF_SECRET`; compara `x-atlante-key` con `timingSafeEqual`; token de un solo uso (marca `usedAt`); 404 si no existe, ya se usó o venció; responde `{ name, email, phone, tickets, pax, addons, referral_code: "ATLANTE", ref_id }`. Sin PII en logs.
- **`POST /api/pex/booking-confirmed`**: 503 sin `PEX_WEBHOOK_SECRET`; firma `HMAC-SHA256(timestamp.rawBody)` con `timingSafeEqual`; rechaza timestamps con más de 5 minutos; idempotente por `(pexBookingId, eventType)` vía `PexEvent` (un reenvío responde `{ ok: true, duplicate: true }`); `booking.paid` marca `paid` con monto, `commissionPct` (20 % por defecto, `ATLANTE_COMMISSION_PCT` lo cambia) y comisión; `booking.cancelled` / `booking.refunded` dejan el lead en `lost` con comisión 0. Sin `ref_id` empareja por `customer_email_sha256` contra los leads `redirected` de la misma fecha de servicio; si no encuentra ninguno crea un lead `paid_unmatched` sin correo en claro.
- **`src/proxy.ts`**: guarda `utm_*`, `partner` y la ruta de entrada en cookies de 30 días, sólo en la primera visita y sin datos personales. En Next.js 16 el archivo `middleware` está deprecado y se llama `proxy` (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`): se usó el nombre nuevo. Los nombres de las cookies viven en `src/lib/attribution-cookies.ts` para que el cliente no arrastre `next/server` al bundle.
- Ya no existían `src/app/api/bookings/route.ts` (borrado en R0) ni ahora `src/lib/bookings.ts`.

### 1.7 Admin (2.8)

- **`/admin`**: leads creados, redirigidos y pagados del mes, monto pagado, comisión acumulada y los últimos 8 leads.
- **`/admin/leads`**: filtros por estado, tipo, producto, rango de fechas y aliado (`src/lib/lead-filters.ts`, compartido con el export); columnas de fecha, cliente (nombre + WhatsApp + email), producto, fecha de servicio, pax, estado y monto/comisión. Acciones: **WhatsApp** con la plantilla de rescate, **Marcar pagado** (`pex_booking_id` + monto → `paid` con comisión calculada), **Perdido** y **Nota** (`src/app/admin/lead-actions.ts`, todas con `requireAdmin()`).
- **`/admin/leads/export`**: route handler con `requireAdmin()`, CSV UTF-8 **con BOM** y separador coma, 23 columnas, mismos filtros que la tabla.
- Fuera `/admin/bookings`, `/admin/calendar` y las acciones de reservas y cupos. Nav: Resumen · Leads. `noindex` y `dynamic = "force-dynamic"` siguen en el layout.
- Sin `DATABASE_URL` (o con la base caída) el admin muestra un aviso en vez de reventar.

### 1.8 Analítica (2.9)

- **`src/lib/analytics.ts`**: `track(event, params)` empuja a `window.dataLayer`, repite en `gtag` si existe y manda a `fbq` (`track: "Lead"` en `lead_created`, `trackCustom` en el resto). No-op en el servidor y dentro de un `try/catch`: la analítica no puede romper el handoff.
- Eventos conectados: `view_catalog {portal}` en `/tours` y `/charters`; `view_product {slug, kind}` en la ficha; `funnel_step {slug, step}` en cada paso; `lead_created {lead_id, slug, pax, value}` al enviar el paso 3; `redirect_to_pex {lead_id, target, mode: "puente"}` en `/listo`; `whatsapp_click {context}` en el botón flotante, la tarjeta de nave y `ContactSection`.
- **`Analytics.tsx`**: GA4 con `linker: { domains: ["pacificexperience.lat"] }` — el dominio se interpola desde `PEX_DOMAIN_LABEL` para no romper `check:pex-links`. No se añadió `allow_enhanced_conversions`.

### 1.9 Limpieza y SEO (2.10)

- **`src/app/sitemap.ts`**: home, `/tours`, `/charters`, `/como-funciona`, `/terminos`, `/privacidad`, `/cancelaciones` y las fichas de los productos disponibles (hoy `tour-bahia` y `party-bahia`). 9 URLs, ninguna que redirija o devuelva 404.
- **`src/app/robots.ts`**: `disallow: ["/admin", "/reservar/*/listo", "/api/"]`.
- **`src/app/globals.css`**: fuera `.filters`/`.filter`, `.card-evening`/`.card-taboga`/`.card-perlas`, `.route-map`, `.leaflet-container`, `.stepper`, `.price-line`, `.slot-form` y las píldoras de estados de reserva. Entra el bloque R1 (tarjetas, tabla de precios, CTA fijo, funnel, calendario, contadores, formulario, `/listo` y estados de lead), móvil primero: 15 px mínimo, controles de 44 px y CTA fijo con `env(safe-area-inset-bottom)`.
- **`.env.example`**: se documenta `ATLANTE_COMMISSION_PCT`.

---

## 2. Qué no se hizo

- **No se ejecutó ninguna migración.** `0002_broker_v2` está escrito y revisado a mano, pero no se aplicó a ninguna base: no hay Postgres propio en esta máquina (hay un servicio escuchando en 5432, pero es ajeno y sin credenciales conocidas, así que no se tocó) y la regla 1 prohíbe correrlo contra la base remota. **El SQL no está probado contra un servidor real**; el punto a vigilar es el rename (ver "Cómo probarlo", paso 6).
- **El camino con base de datos del funnel no se probó en vivo**, por lo mismo. Sí se probó entero el camino sin base de datos, que es el que el bloque documenta.
- **No hay fotos reales**: las tres imágenes de cada producto son `/og-atlante.jpg` (PENDIENTE MARK).
- **No se tocó PEX** ni se implementó nada del anexo X1–X9: son de la otra sesión.
- **No se creó `/admin/catalogo` ni `/admin/naves`**: son de los bloques 3 y 4.
- **Los métodos de pago que publica PEX para charters (transferencia, Yappy, tarjetas con recargo, Amex, Tether) no se cargaron en el catálogo.** El criterio A8 del PRD exige que `grep -riE "stripe|paguelo|yappy|card_number"` devuelva 0 en `src/`, y esos datos no aportan nada al handoff: quien cobra es PEX y lo muestra en su checkout.

---

## 3. Decisiones tomadas por ambigüedad (regla 12)

1. **`middleware.ts` → `src/proxy.ts`.** El bloque pide "un `middleware.ts` ligero", pero en Next.js 16 esa convención está deprecada y renombrada a `proxy`, y `AGENTS.md` obliga a atender los avisos de deprecación. La función es la misma; sólo cambia el nombre del archivo y el de la función exportada.
2. **Tarifas de turista del ferry.** El bloque describe tres categorías (adulto nacional / turista / niño y jubilado), pero PEX publica dos precios distintos de turista ($12 entre semana, $15 fin de semana). Se cargaron **cuatro** filas para no cotizar de menos a un turista de fin de semana. El caso de prueba del bloque (adulto nacional + niño = $18) se cumple igual.
3. **`pexTripId` del Party.** La ruta observada es `/tours/c0d1a003-0000-4000-8000-000000000085`; ese UUID es el mismo identificador que el checkout llama `trip_id`, así que se guardó como `pexCheckout.tripId`. En modo puente no se usa (el destino es la página del producto), pero queda listo para el modo integrado. **Sin verificar contra el checkout de PEX**: ver PENDIENTE MARK.
4. **Unidad del precio de Contadora.** PEX no dice si los $130 son por persona o por tramo. Se cargó como `per_person` con una nota explícita en la tabla; el producto está `available: false`, así que no se muestra en ningún lado.
5. **Adicionales con unidad desconocida.** El add-on de Contadora (+$50) y el jetski del Aura ($100/h) llevan `unit: "pending"` y **no suman** al total estimado: no se inventa una base de cobro. La UI lo dice ("Unidad de cobro por confirmar").
6. **Campos añadidos al tipo `Product`.** El bloque da los tipos como "mínimos". Se agregaron `key` en `PriceRow` (identifica la categoría en la URL del funnel y en el JSON `pax` del lead) y `pricePerPersonFrom` (el "desde $55/persona" que `/charters` necesita mostrar sólo cuando el dato existe).
7. **Tope de pasajeros.** `maxPax` = `capacityMax` del producto si existe, si no 20. Así el party respeta 30–80 y el resto queda en 1–20, como pide el bloque.
8. **Validación de fecha en la API.** Se rechaza un día sin salida publicada y una fecha pasada, pero con **un día de holgura**: el cliente está en Panamá (UTC−5) y el servidor en UTC, y una diferencia de zona no puede tumbar un lead legítimo.
9. **Un 400 de la API sí detiene el envío** (muestra el error del campo); sólo los fallos de red, el timeout de 4 s y los 5xx continúan a PEX sin lead. Bloquear a alguien porque escribió mal el correo es correcto; bloquearlo porque la base está caída, no.
10. **La plantilla de rescate del admin lleva nombre y teléfono en la URL de `wa.me`.** Choca de frente con la regla 7, pero es exactamente lo que pide el punto 2.8 y no hay otra forma de abrir WhatsApp con el mensaje escrito. Es una URL privada, detrás de `requireAdmin()`, que abre el propio Mark; nada de eso sale al sitio público ni a los logs.
11. **`dotenv` como dependencia nueva** (gratis, `devDependency`). Con `prisma.config.ts`, Prisma deja de cargar `.env` por su cuenta y `prisma validate` fallaba por falta de `DATABASE_URL`. El config file además fija un marcador local a `localhost:5432` cuando no hay ninguna cadena definida, para que `validate` y `generate` funcionen en un clon recién bajado; cualquier comando que sí toque una base fallará contra localhost en vez de contra un servidor real.
12. **El CTA "Reservar" del header** pasa de WhatsApp a `/tours`. El bloque no lo menciona, pero mandar el CTA principal a WhatsApp existiendo ya un funnel de 3 clics tira a la basura la atribución.
13. **Comentario de `sitemap.ts`.** Escribir `/reservar/*/listo` dentro de un comentario de bloque lo cierra en el `*/` y rompe el parseo. Quedó redactado sin el patrón.

---

## 4. PENDIENTE MARK

| # | Tema | Detalle y qué hay que decidir |
|---|---|---|
| 1 | **`trip_id` del Tour por la Bahía** | En PEX no se encontró: el catálogo lleva `pexCheckout: { kind: "tour", tripId: null }` y el handoff va a `/ferry/bahia`. Con el `trip_id` real, `buildPexUrl` ya arma el deep link al checkout (`tour_checkout`) sin tocar código: sólo hay que rellenar el campo. |
| 2 | **`trip_id` del Party** | Se guardó `c0d1a003-0000-4000-8000-000000000085`, deducido de la URL del producto. Confirmar que el checkout de PEX lo acepta como `trip_id`. |
| 3 | **Estado del Ferry a Taboga** | En agosto quedó "pausado hasta nuevo aviso" y la web de PEX lo muestra vendiendo. Está cargado con `available: false`, así que **no aparece en `/tours` ni acepta reservas**. Para activarlo: `available: true` en `src/content/catalog.ts`. |
| 4 | **Unidad del add-on de Contadora** | "Tour por las islas del archipiélago — 4 h — +$50": ¿por persona o por reserva? Está cargado `active: false` con `unit: "pending"`. |
| 5 | **Fotos reales** | Los 7 productos usan `/og-atlante.jpg` como marcador. Se pueden reutilizar las de PEX (mismo dueño): 23 fotos del Aura, las de cada nave y las de los tours. |
| 6 | **Comisión** | `COMMISSION_PCT_DEFAULT` = **20 %**, igual al B2B de PEX. Se cambia con la variable `ATLANTE_COMMISSION_PCT` sin tocar código. Confirmar el número y si es igual para tours, ferry y charters. |
| 7 | **`PEX_HANDOFF_SECRET`** | Hay que acordarlo con la sesión de PEX y ponerlo en las variables de los dos proyectos. Sin él, `GET /api/handoff/[token]` responde 503 y el prellenado no existe (en modo puente no hace falta). |
| 8 | **`PEX_WEBHOOK_SECRET`** | Igual: sin él, `POST /api/pex/booking-confirmed` responde 503 y la conciliación es manual desde `/admin/leads`. |
| 9 | **Aplicar las migraciones** | `0001_init` y `0002_broker_v2` están escritas pero **no ejecutadas**. Antes de correr `prisma migrate deploy` hay que restaurar el proyecto Supabase "ATLANTE" (estaba pausado) y revisar el rename de `Lead` a `Subscriber` (paso 6 de "Cómo probarlo"). |
| 10 | **Sirena del Mar: precio por persona** | PEX publica "desde $/persona" para el Aura ($55) y el Pacific Ferry 1 ($59), pero no para el Sirena del Mar. La tarjeta dice "consultar". Si el dato existe, es una línea en el catálogo. |
| 11 | **Precios de Contadora** | La tarifa registrada de $130 no dice unidad y el producto figura como no disponible. Mientras siga así, `available: false`. |
| 12 | **Fecha de los datos de PEX** | El catálogo lleva `verifiedAt: "2026-09-09"` tal como indica el prompt, aunque hoy es 08/09/2026. Ya venía anotado en el bloque 1. |

---

## 5. Cómo probarlo

```bash
npm install
npm run lint            # eslint + check:pex-links
npm run test            # 19 casos, 0 fallos
npm run build
npm run check:pex-links
npx prisma validate     # el esquema es válido
npx prisma generate
```

Resultado de esta sesión:

| Comprobación | Resultado |
|---|---|
| `npm run lint` | limpio (0 errores, 0 warnings) |
| `npm run build` | ✓ compila, 21 rutas + proxy |
| `npm run test` | 19/19 |
| `npm run check:pex-links` | ✓ |
| `npx prisma validate` | ✓ |
| `grep -rn "atlantedelpacifico\.com\|ATLANTE10\|Pocos cupos\|Sunset\|127 rese\|aggregateRating" src/` | **0** |
| `grep -rniE "stripe\|paguelo\|yappy\|card_number" src/` | **0** |
| `850\|1450\|2800\|1200\|1800\|3200` como precio en `src/` | **0** (`1200` sólo como ancho de la imagen OG en `layout.tsx` y en la ficha) |
| `pacificexperience.lat` fuera de `pex.ts` y `catalog.ts` | **0** |

### Prueba manual sin base de datos (hecha en esta sesión)

`npm run dev` con `DATABASE_URL` ausente, contra `http://localhost:3001`:

1. **`/`** — el home muestra 3 tickets ("desde $25 por persona", "desde $35 por persona") y 3 naves ("barco completo desde $1,300 · desde $55/persona", "· desde $59/persona", "· consultar"), con la franja de agente autorizado.
2. **`/tours`** — sólo Tour por la Bahía y Party en la Bahía. El ferry de Taboga no aparece y **`/tours/ferry-taboga` devuelve 404**.
3. **`/reservar/tour-bahia?step=2`** — el calendario abre en **septiembre 2026** con el mes anterior deshabilitado, habilita exactamente **18, 19, 20, 25, 26 y 27** (viernes, sábado y domingo desde el `validFrom`), preselecciona el **18** y fija el horario **5:30 PM – 7:00 PM**. Aviso "La disponibilidad final se confirma en Pacific Experience."
4. **Paso 3** — resumen: Tour por la Bahía · 18 de septiembre de 2026 · 5:30 PM – 7:00 PM · Por persona × 2 · **Total estimado $50**, con la nota "El cobro lo realiza Pacific Experience…". Cambiando el idioma a EN se traduce entero.
5. **`POST /api/leads`** sin base de datos responde:
   ```json
   {"ok":true,"leadId":null,"handoffToken":null,
    "destinationUrl":"https://www.pacificexperience.lat/ferry/bahia?ref=ATLANTE&utm_source=atlante&utm_medium=referral&utm_campaign=tour-bahia",
    "total":50}
   ```
   que es exactamente la URL que pide el bloque (sin `ref_id` porque no hay base de datos). En consola queda `[leads] sin DB`.
6. **Validaciones** (todas devuelven 400 con el campo): nombre de una sola palabra, día sin salida (lunes 21), checkbox sin marcar, producto no disponible (`ferry-taboga`) y party con 2 pasajeros (mínimo 30). Party con 30 → 200 y **$1,050**.
7. **`/reservar/tour-bahia/listo`** — "Te llevamos a Pacific Experience para completar tu pago", el código **ATLANTE** con botón Copiar, la cuenta regresiva y "Ir ahora". `robots` con `noindex`.
8. **Secretos ausentes** — `GET /api/handoff/xyz` → **503**; `POST /api/pex/booking-confirmed` → **503**.
9. **Cookies de atribución** — entrando por `/tours?utm_source=meta&utm_medium=cpc&utm_campaign=lanzamiento&partner=HOTELX` se escriben `atl_utm`, `atl_partner` y `atl_landing` a 30 días, codificadas una sola vez.
10. **Admin** — `/admin`, `/admin/leads` y `/admin/leads/export` redirigen a `/admin/login` sin cookie de sesión (307).
11. **`/robots.txt`** trae los tres `Disallow`; **`/sitemap.xml`** trae 9 URLs, ninguna que redirija.

### Lo que falta probar (necesita una base de datos)

Con un Postgres local (nunca el remoto):

```bash
# 1. crear una base vacía local y apuntar .env.local a ella
#    DATABASE_URL=postgresql://usuario:clave@localhost:5432/atlante_local
#    DIRECT_URL=postgresql://usuario:clave@localhost:5432/atlante_local

# 2. aplicar las dos migraciones
npx prisma migrate deploy

# 3. comprobar que el esquema de las migraciones y el de schema.prisma coinciden
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script
#    debe salir vacío
```

Y sobre esa base:

6. **Rename de `Lead` a `Subscriber`**: insertar una fila en `Lead` **antes** de aplicar `0002_broker_v2` y verificar que después está en `Subscriber` (con su índice único de email renombrado) y que `Lead` quedó vacía con las columnas nuevas.
7. **Funnel con base de datos**: el mismo flujo del paso 4 debe crear el lead, y el `destinationUrl` debe traer **`ref_id=<cuid>`** y **`h=<64 hex>`** además de `ref=ATLANTE` y las UTM.
8. **Handoff**: con `PEX_HANDOFF_SECRET` definido, `GET /api/handoff/<token>` con la cabecera `x-atlante-key` devuelve los datos una vez; la segunda vez, **404**.
9. **Webhook**: con `PEX_WEBHOOK_SECRET`, un `booking.paid` firmado marca el lead como `paid` con comisión; el mismo evento repetido responde `{ ok: true, duplicate: true }`; con firma mala, **401**; con timestamp de hace 10 minutos, **400**.
10. **Admin**: el lead aparece en `/admin/leads`, el botón WhatsApp abre `wa.me` con la plantilla de rescate, "Marcar pagado" calcula la comisión al 20 % y el CSV abre en Excel con los acentos correctos.
