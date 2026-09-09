# Bloque 2 — R1 · Ticketería PEX en modo puente (P0) — el bloque más importante

Objetivo: catálogo REAL de Pacific Experience + funnel de 3 clics que guarda el lead y redirige a PEX con nuestro código (`ref=ATLANTE&ref_id=<lead>`). Todo funciona sin base de datos; con base de datos guarda leads, handoffs y eventos. "Modo puente" = PEX todavía no lee parámetros por URL ni expone feed: el cliente llega a la página del producto en PEX y, si el checkout se lo pide, pega el código ATLANTE (por eso se lo mostramos y se lo copiamos al portapapeles antes de saltar).

## 2.1 Datos verificados de PEX (recorrido en vivo del 09/09/2026) — úsalos tal cual

| Producto | Tipo | Datos publicados por PEX | Ruta en PEX (`pexPath`) | Checkout conocido | `available` |
|---|---|---|---|---|---|
| Tour por la Bahía (Pacific Ferry 1) | `tour` | $25 por persona · 1 h 30 min · salidas 5:30–7:00 PM y 8:00–9:30 PM · viernes, sábado y domingo desde el 18/09/2026 · incluye fee de puerto y parqueo gratis · zarpa de Isla Perico, Amador · boarding con código QR por email · pago online 100 % al reservar | `/ferry/bahia` | `/tours/checkout?slot_id=&trip_id=&date=` (los IDs viven en PEX; `trip_id` NO ENCONTRADO → `pexTripId: null`) | `true` |
| Party en la Bahía (Sirena del Mar) | `party` | Desde $35 por persona · 2 h 30 min · viernes y sábado 7:00–9:30 PM · grupos de 30 a 80 personas · DJ, bebida de bienvenida y barra de pago | `/tours/c0d1a003-0000-4000-8000-000000000085` | igual que el anterior | `true` |
| Ferry a Isla Taboga (boleto abierto) | `ferry` | Adulto nacional desde $10 por tramo · turista $12 entre semana / $15 fin de semana · niño y jubilado $8 · peaje de entrada a Taboga $1 en efectivo (no incluido) · seis salidas diarias desde Isla Perico 5:45 AM–3:35 PM y seis regresos 6:35 AM–4:30 PM · ~30 min de travesía · boleto válido 180 días para cualquier salida | `/ferry/taboga` | NO ENCONTRADO (botón "Comprar boleto" sin URL visible) → enlaza `/ferry/taboga` | `false` — PENDIENTE MARK (en agosto quedó "pausado hasta nuevo aviso"; la web de PEX lo muestra vendiendo). Que Mark lo active cambiando un booleano |
| Ferry a Contadora | `ferry` | $130 registrado · "no disponible por el momento" · add-on "Tour por las islas del archipiélago — 4 h — +$50" (unidad por persona o por reserva: PENDIENTE MARK) | `/ferry/contadora` (NO VERIFICADO) | — | `false` |
| Chárter Aura (catamarán) | `charter_pex` | Barco completo desde $1,300 · desde $55/persona · hasta 35 personas (Bahía/Puente), 30 (Taboga), 15 (Las Perlas) · 4 h / 8 h / 12 h · Isla Taboga 8 h: $1,700 hasta 15 pax, $2,250 hasta 30 pax · Marina Flamenco, Amador · reserva con 30 % de abono y 70 % 24 h antes · reembolso completo dentro de las primeras 24 h tras pagar el abono · incluye combustible, capitán y marino, hielo, coolers, nevera, congelador, toallas, agua y sodas, BBQ, piscina de mar, A/C, camarotes, baños, agua caliente, sonido · bajo solicitud: snorkel, kayaks, sillas flotantes, pesca; BBQ $20/persona, catering con chef $30/persona, open bar $15/persona, jetski $100/h, hora extra $300 · métodos que muestra PEX: transferencia, Yappy, tarjetas (+7 %), Amex (+3 % extra), Tether | `/charter/aura` | `/charter/checkout?vessel=aura` | `true` |
| Chárter Pacific Ferry 1 | `charter_pex` | Hasta 30 personas · 4 h / 8 h / 12 h · Bahía y Puente 4 h: $1,300 hasta 15 pax / $1,790 hasta 30 · Isla Taboga 8 h: $1,700 hasta 15 / $2,250 hasta 30 · Las Perlas 12 h: $3,000 hasta 15 / $3,550 hasta 30 · "desde $59/persona" · 30 % de abono, 70 % 24 h antes · incluye capitán y tripulación, combustible, hielo y coolers, agua y sodas, BBQ, cubierta techada, salón interior, baños, sonido, toallas · Marina Flamenco | `/charter/pacific-ferry-1` | `/charter/checkout?vessel=pacific-ferry-1` | `true` |
| Chárter Sirena del Mar | `charter_pex` | Hasta 80 personas · 4 h / 8 h / 12 h · Bahía y Puente 4 h: $1,300 hasta 15 / $1,950 hasta 35 / $3,410 hasta 80 · Isla Taboga 8 h: $1,700 hasta 15 / $2,250 hasta 30 / $4,080 hasta 80 · Las Perlas 12 h: $3,000 hasta 15 / $5,380 hasta 80 · 30 % de abono, 70 % 24 h antes · incluye capitán y tripulación, combustible, hielo y coolers, agua y sodas, BBQ, A/C, cabina cerrada, baños, sonido, toallas · opcional: snorkel, kayaks, sillas flotantes, pesca · Marina Flamenco | `/charter/sirena-del-mar` | `/charter/checkout?vessel=sirena-del-mar` | `true` |

Políticas generales de PEX observadas: tours compartidos se pagan 100 % al reservar; reembolso solo hasta 24 h antes. Charters: 30 % de abono, saldo 24 h antes, reembolso completo en las primeras 24 h tras el abono. Contactos de PEX (no los muestres en Atlante): +507 6493-5541 y +507 6441-5920. Fotos: no hay fotos de PEX en este repo; usa las imágenes actuales de `public/` como placeholder y deja `PENDIENTE MARK: fotos reales de cada producto/nave (mismo dueño, se pueden reutilizar las de PEX)`.

## 2.2 Catálogo en código — `src/content/catalog.ts` (reemplaza `src/content/tours.ts`)

Un solo archivo tipado con `verifiedAt` y `sourceUrl` por producto (la edición desde admin queda para el bloque 3). Tipos mínimos:

```ts
export type Locale = "es" | "en";
export type Localized = Record<Locale, string>;
export type ProductKind = "tour" | "party" | "ferry" | "charter_pex";
export type PriceUnit = "per_person" | "per_segment" | "per_boat";
export interface PriceRow { label: Localized; price: number; note?: Localized }          // p. ej. Adulto nacional / Turista / Niño y jubilado, o tramos de capacidad
export interface Schedule { weekdays: number[]; times: { start: string; end?: string }[]; validFrom?: string; note?: Localized }  // 0 = domingo
export interface Product {
  slug: string; kind: ProductKind; source: "pex";
  name: Localized; summary: Localized; description: Localized;
  priceFrom: number; priceUnit: PriceUnit; priceTable?: PriceRow[];
  durationMin?: number; durationLabel: Localized;
  schedule?: Schedule; capacityMin?: number; capacityMax?: number;
  includes: Localized[]; notIncluded?: Localized[]; policies: Localized[];
  addons?: { slug: string; name: Localized; price: number; unit: "per_person" | "per_booking" | "pending"; durationMin?: number; active: boolean }[];
  images: string[];
  pexPath: string; pexCheckout?: { kind: "tour"; tripId: string | null } | { kind: "charter"; vessel: string };
  available: boolean; verifiedAt: string; sourceUrl: string; order: number;
  badges?: ("family" | "adventure" | "romantic" | "celebration" | "snorkel" | "group" | "evening")[];
}
export const catalog: Product[]; export function getProduct(slug): Product | undefined;
export const ticketProducts = catalog.filter(p => ["tour","party","ferry"].includes(p.kind));
export const pexVessels = catalog.filter(p => p.kind === "charter_pex");
```

Slugs: `tour-bahia`, `party-bahia`, `ferry-taboga`, `ferry-contadora`, `charter-aura`, `charter-pacific-ferry-1`, `charter-sirena-del-mar`. `verifiedAt: "2026-09-09"`, `sourceUrl` = `https://www.pacificexperience.lat` + `pexPath` (es un dato, no un enlace: puede vivir en el catálogo, pero cualquier `href` que se renderice pasa por `buildPexUrl`). Textos ES/EN escritos por ti a partir de los datos de 2.1, sin añadir nada que no esté ahí. Borra `src/content/tours.ts` y todo lo que dependa de él (`Badges` puede quedarse adaptado a los nuevos badges).

## 2.3 `src/lib/pex.ts` completo + tests + guardarraíl

```ts
export type PexTarget = "home" | "path" | "tour_page" | "tour_checkout" | "charter_page" | "charter_checkout";
export function buildPexUrl(opts: {
  target: PexTarget; path?: string; tripId?: string | null; slotId?: string; date?: string; tickets?: number;
  vessel?: string; addons?: string[]; leadId?: string; handoffToken?: string; campaign?: string;
}): string
```

- Base: `NEXT_PUBLIC_PEX_BASE_URL` o `https://www.pacificexperience.lat`.
- `tour_page` → `path` (p. ej. `/ferry/bahia`); `tour_checkout` → `/tours/checkout` con `trip_id`, `slot_id`, `date`, `tickets` (solo los presentes); si falta `tripId` cae a `tour_page`. `charter_page` → `path`; `charter_checkout` → `/charter/checkout?vessel=`.
- Siempre: `ref=ATLANTE`, `utm_source=atlante`, `utm_medium=referral`, `utm_campaign=<campaign ?? slug ?? "site">`; `ref_id=<leadId>` si existe; `h=<handoffToken>` si existe; `addon=<slug>` repetido por cada add-on. Prohibido cualquier otro parámetro (nada de nombre/email/teléfono).
- `export const ATLANTE_REF = "ATLANTE"`.
- Tests con el test runner de Node: `tests/pex.test.ts` (`import { test } from "node:test"; import assert from "node:assert/strict"`), script `"test": "node --import tsx --test tests/pex.test.ts tests/leads.test.ts"` (lista explícita de archivos: funciona igual en Windows). Casos: cada target contiene `ref=ATLANTE`; `ref_id` aparece solo con lead; `tour_checkout` sin `tripId` cae a la página; los add-ons se repiten; nunca aparecen `name`, `email`, `phone`.
- Guardarraíl: `scripts/check-pex-links.mjs` recorre `src/` y falla (exit 1) si encuentra `pacificexperience.lat` fuera de `src/lib/pex.ts` y `src/content/catalog.ts` (allí solo como `sourceUrl`). Script `"check:pex-links": "node scripts/check-pex-links.mjs"`. Añádelo a `"lint"`: `"lint": "eslint && node scripts/check-pex-links.mjs"`.

## 2.4 Prisma — modelos nuevos y migración (sin tocar la base de datos remota)

1. Copia `prisma/schema.prisma` a `prisma/schema.base.prisma` ANTES de editar (se usa para el diff y luego se borra).
2. Cambios en `schema.prisma`:
   - Renombra el modelo `Lead` actual (email único, newsletter) a `Subscriber` (`@@map("Subscriber")`).
   - Nuevo `enum LeadStatus { created redirected paid paid_unmatched lost quote_requested quoted accepted }` y `enum LeadType { tour party ferry charter_pex charter_partner }`.
   - Nuevo `model Lead { id String @id @default(cuid()); type LeadType; productSlug String?; vesselSlug String?; serviceDate DateTime? @db.Date; timeSlot String?; pax Json?; paxTotal Int?; addons Json?; name String; email String; phone String; partnerCode String?; utmSource String?; utmMedium String?; utmCampaign String?; landingPath String?; destinationUrl String?; status LeadStatus @default(created); pexBookingId String? @unique; amount Decimal? @db.Decimal(10,2); commissionPct Decimal? @db.Decimal(5,2); commissionAmount Decimal? @db.Decimal(10,2); notes String?; createdAt DateTime @default(now()); redirectedAt DateTime?; paidAt DateTime?; updatedAt DateTime @updatedAt; handoffs Handoff[]; events PexEvent[]; @@index([status, createdAt]); @@index([email]); @@index([serviceDate]) }`.
   - `model Handoff { token String @id; leadId String; lead Lead @relation(fields:[leadId], references:[id], onDelete: Cascade); expiresAt DateTime; usedAt DateTime?; createdAt DateTime @default(now()) }`.
   - `model PexEvent { id String @id @default(cuid()); pexBookingId String; eventType String; payload Json; signatureOk Boolean; leadId String?; lead Lead? @relation(...); createdAt DateTime @default(now()); @@unique([pexBookingId, eventType]) }`.
   - `model PartnerApplication { id String @id @default(cuid()); name String; vesselName String?; capacity Int?; zone String?; whatsapp String; email String?; photos Json?; status String @default("new"); createdAt DateTime @default(now()) }`.
   - Deja `Booking`, `Payment`, `AvailabilitySlot`, `Customer`, `Coupon`, `GiftCard`, `Review`, `Reseller` como están (dejan de usarse en el sitio público).
3. Migraciones: crea `prisma/migrations/migration_lock.toml` (`provider = "postgresql"`), `prisma/migrations/0001_init/migration.sql` con el contenido íntegro de `prisma/initial-schema.sql`, y `prisma/migrations/0002_broker_v2/migration.sql` generado con `npx prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma --to-schema-datamodel prisma/schema.prisma --script`. Revisa que el rename `Lead` → `Subscriber` quede como `ALTER TABLE "Lead" RENAME TO "Subscriber"` (edita el SQL a mano si el diff genera DROP + CREATE; la tabla puede tener datos). Borra `schema.base.prisma`. Sustituye `package.json#prisma` por `prisma.config.ts` (Prisma 6.19 lo pide) manteniendo `seed`.
4. `npx prisma generate` y `npx prisma validate` deben pasar. NO ejecutes `migrate dev/deploy/push`.
5. `prisma/seed.ts`: elimina la creación de cupos y del cupón; déjalo como no-op idempotente que solo imprime "catálogo en código; nada que sembrar" (o bórralo y quita el script si prefieres).

## 2.5 Páginas públicas

- `/tours` (`src/app/(site)/tours/page.tsx`): catálogo de `ticketProducts` con `available === true`: tarjeta con foto, nombre, precio real ("desde $25 por persona" / "desde $10 por tramo"), duración, días de salida, badge del tipo, CTA "Reservar" → `/reservar/[slug]`. `PexDisclosure` variante `banner` arriba. Metadata + JSON-LD `ItemList`.
- `/tours/[slug]`: ficha desde el catálogo (404 si no existe o `available === false`): galería, descripción, incluye, horario, políticas del operador, tabla de precios, CTA fijo en móvil "Reservar — desde $X" → `/reservar/[slug]`. JSON-LD `TouristTrip` + `Offer` con el precio real y `provider` = Pacific Experience. `generateStaticParams` con los slugs disponibles.
- `/charters` (placeholder mejorado, el marketplace completo llega en el bloque 4): tarjetas de `pexVessels` con capacidad, duraciones, "barco completo desde $X · desde $Y/persona" (solo si el dato existe; si no, "consultar"), badge "Reserva directa en Pacific Experience" y CTA "Reservar en PEX" → `buildPexUrl({ target: "charter_checkout", vessel, campaign: slug })` (sin lead en este bloque; la captura de lead para charters llega en el bloque 4) + CTA secundario WhatsApp de Atlante. Enlace "Ver ficha en PEX" → `charter_page`.
- Home: `ToursSection` y `ChartersSection` leen del catálogo (3 tickets + 3 naves) y enlazan a `/tours` y `/charters`. Elimina filtros por categoría inventada.
- `/reservar/[slug]` y `/reservar/[slug]/listo`: ver 2.6.
- Elimina `RouteMap.tsx` (los productos no tienen coordenadas de ruta verificadas) y `react-leaflet`/`leaflet` de `package.json` si ya nada los usa. `WeatherWidget` puede quedarse en la ficha (dato real de Open-Meteo).

## 2.6 Funnel de 3 clics — `/reservar/[slug]` (client component `components/funnel/Funnel.tsx`)

Estado en la URL (`?step=&date=&slot=&pax=&addons=`) para poder volver atrás. Barra de progreso de 3 pasos. 404 si el producto no existe o no está disponible.

- Paso 1 (resumen y confirmación del producto): nombre, precio real, duración, "Pago seguro en Pacific Experience" (`PexDisclosure` inline), botón "Elegir fecha".
- Paso 2 (fecha y pasajeros): calendario mensual propio (sin librerías pesadas) donde SOLO se habilitan los días de la semana de `schedule.weekdays` desde `max(hoy+1, validFrom)`; abre en el mes de la primera fecha habilitada y la preselecciona. Selector de horario con `schedule.times` (si hay uno solo, fijo). Cantidad por categoría según `priceTable` (ferry: adulto nacional / turista / niño y jubilado; tour: por persona) con mínimo 1 y máximo 20 (party: mínimo 30, máximo 80 → si el producto tiene `capacityMin`, respétalo y muestra "grupo mínimo 30"). Bloque "Adicionales" con los `addons` activos. Aviso: "La disponibilidad final se confirma en Pacific Experience." Para `ferry` (boleto abierto, sin hora fija): la fecha es "fecha estimada de viaje" y el horario se omite.
- Paso 3 (datos): resumen (producto, fecha, horario, pasajeros por categoría, adicionales, total estimado = Σ precio × cantidad + adicionales, con nota "El cobro lo realiza Pacific Experience; el total final lo verás en su checkout"), campos `nombre` (≥ 2 palabras), `whatsapp` (input con prefijo +507 por defecto; normaliza a E.164 sin `+`), `email`, `partnerCode` (opcional, prellenado desde `?partner=` o cookie `atl_partner`), checkbox obligatorio "Acepto las políticas de Pacific Experience y que Atlante transfiera mis datos a Pacific Experience para completar la reserva" (con enlaces a `/terminos` y `/privacidad`). Botón "Continuar al pago en Pacific Experience".
- Envío: `POST /api/leads` (ver 2.7). Con la respuesta (`leadId`, `handoffToken`, `destinationUrl`) navega a `/reservar/[slug]/listo?lead=<id>` pasando el `destinationUrl` por `sessionStorage` (no por URL). Si la API falla o tarda más de 4 s: construye `destinationUrl` en el cliente con `buildPexUrl` sin `leadId`, registra el error en consola y continúa igual. El handoff nunca se bloquea.
- Pantalla `/listo`: "Te llevamos a Pacific Experience para completar tu pago", resumen, cuenta regresiva de 3 s con botón "Ir ahora", y la línea "Tu código de referido es ATLANTE — si el checkout te lo pide, pégalo" con botón "Copiar" (`navigator.clipboard`, con fallback). Al saltar: `window.location.assign(destinationUrl)` (misma pestaña), dispara `redirect_to_pex` y hace `POST /api/leads/[id]/redirected` (best-effort, `keepalive: true`). `noindex`.
- Textos en ES/EN. Todo usable a 390 px sin scroll horizontal; tipografía ≥ 15 px.

## 2.7 APIs

- `POST /api/leads`: valida (zod no está instalado: valida a mano o añade `zod`, es gratuito), recalcula el total en el servidor desde el catálogo (el cliente no manda precios), crea `Lead` (`status: created`, `type` según `kind`, `landingPath` desde la cookie `atl_landing` si existe, `utm_*` desde la cookie `atl_utm` — crea un `middleware.ts` ligero que guarde en cookies de 30 días los `utm_*` y `partner` de la primera visita), crea `Handoff` (token 32 bytes hex, `expiresAt = now + 30 min`), construye `destinationUrl` con `buildPexUrl({ target: kind === "charter_pex" ? "charter_checkout" : "tour_page", path: pexPath, leadId, handoffToken, addons, campaign: slug })` y lo guarda en el lead. Respuesta `{ ok, leadId, handoffToken, destinationUrl }`. Sin DB (`DATABASE_URL` ausente o error de conexión): responde igual `{ ok: true, leadId: null, destinationUrl }` con `destinationUrl` sin `ref_id` y registra `console.warn("[leads] sin DB")`. Nunca 500 por la DB. Rate-limit simple en memoria por IP (p. ej. 20/min).
- `POST /api/leads/[id]/redirected`: marca `redirectedAt` y `status: redirected` (best-effort).
- `GET /api/handoff/[token]`: requiere cabecera `x-atlante-key` igual a `PEX_HANDOFF_SECRET` (si la variable no existe → 503); token de un solo uso (marca `usedAt`), 404 si no existe, usado o vencido; responde `{ name, email, phone, tickets, pax, addons, referral_code: "ATLANTE", ref_id }`. Sin PII en logs.
- `POST /api/pex/booking-confirmed` (webhook, esqueleto listo para el bloque 3): cabeceras `x-pex-timestamp` y `x-pex-signature` = HMAC-SHA256(`${timestamp}.${rawBody}`, `PEX_WEBHOOK_SECRET`) comparada con `timingSafeEqual`; rechaza timestamps con más de 5 min; idempotente por `(pex_booking_id, event)` vía `PexEvent`; eventos `booking.paid` (→ `status: paid`, `amount`, `paidAt`, `commissionPct` = `COMMISSION_PCT_DEFAULT` 20 editable por env `ATLANTE_COMMISSION_PCT`, `commissionAmount`), `booking.cancelled` / `booking.refunded` (→ `status: lost`, comisión 0). Lead sin `ref_id`: si `customer_email_sha256` coincide con algún lead `redirected` de la misma `service_date`, empareja; si no, crea un lead `paid_unmatched` con los datos del evento (sin email en claro). Sin `PEX_WEBHOOK_SECRET` → 503.
- Borra `src/app/api/bookings/route.ts` y `src/lib/bookings.ts` (el admin nuevo no los usa).

## 2.8 Admin (misma auth de `lib/auth.ts`)

- `/admin` (resumen): leads creados / redirigidos / pagados del mes, monto pagado y comisión acumulada, últimos 8 leads.
- `/admin/leads`: tabla con filtros (`status`, `type`, rango de fechas, `productSlug`, `partnerCode`), columnas: fecha, cliente (nombre + WhatsApp + email), producto, fecha de servicio, pax, estado, monto/comisión, acciones: "WhatsApp" (abre `wa.me/<phone>` desde el número de Atlante con la plantilla de rescate: "Hola {nombre}, soy del equipo de Atlante del Pacífico. Vi que empezaste tu reserva de {producto} para el {fecha}. ¿Te ayudo a completarla? Enlace directo: {destinationUrl}"), "Marcar pagado" (formulario con `pex_booking_id` y monto → estado `paid`, comisión calculada), "Perdido", "Nota". Export CSV en `/admin/leads/export` (route handler con `requireAdmin`, UTF-8 con BOM, separador coma).
- Elimina `/admin/bookings`, `/admin/calendar` y las acciones asociadas (`confirmAction`, `markPaidAction` de bookings, slots). Nav: Resumen · Leads · (Catálogo y Naves llegan en bloques 3 y 4).
- `/admin/*` con `noindex` y `dynamic = "force-dynamic"` (ya está en el layout).

## 2.9 Analítica

- `src/lib/analytics.ts`: `track(event, params)` que empuja a `window.dataLayer` (GA4 vía `gtag` si existe) y a `fbq` si existe; no-op en servidor. Eventos: `view_catalog {portal}`, `view_product {slug, kind}`, `funnel_step {slug, step}`, `lead_created {lead_id, slug, pax, value}`, `redirect_to_pex {lead_id, target, mode: "puente"}`, `whatsapp_click {context}`.
- `Analytics.tsx`: en la config de GA4 añade `linker: { domains: ["pacificexperience.lat"] }` y `allow_enhanced_conversions` no. Meta: `fbq('track','Lead')` en `lead_created`.
- Conecta `whatsapp_click` en `WhatsAppFloat`, tarjetas y el admin no (solo público).

## 2.10 Limpieza y verificación

- Borra archivos muertos: `PriceCalculator.tsx`, `CompareTable.tsx`, `RouteMap.tsx`, `content/tours.ts`, `lib/bookings.ts`, `api/bookings`, páginas de admin retiradas, CSS sin uso.
- `sitemap.ts`: home, `/tours`, `/tours/[slug]` disponibles, `/charters`, `/como-funciona`, `/terminos`, `/privacidad`, `/cancelaciones`. `robots.ts`: `disallow: ["/admin", "/reservar/*/listo", "/api/"]`.
- Tests: `npm run test` (pex + un test de `computeTotal` del funnel con el catálogo real: 2 adultos del tour bahía = $50; ferry 1 adulto nacional + 1 niño = $18).
- `npm run lint && npm run build && npm run test && npm run check:pex-links` deben pasar.
- Prueba manual documentada en el reporte: `npm run dev` sin `DATABASE_URL` → completar el funnel del tour bahía → la pantalla `/listo` muestra el código y el `destinationUrl` es `https://www.pacificexperience.lat/ferry/bahia?ref=ATLANTE&utm_source=atlante&utm_medium=referral&utm_campaign=tour-bahia` (sin `ref_id` porque no hay DB). Con `DATABASE_URL` local, el mismo flujo crea el lead y añade `ref_id` y `h`.
- Reporte `docs/reportes/bloque-02.md` con PENDIENTE MARK: `trip_id` del tour bahía en PEX, estado del ferry Taboga, unidad del add-on de Contadora, fotos reales, comisión (20 % por defecto), `PEX_HANDOFF_SECRET`/`PEX_WEBHOOK_SECRET` a acordar con la sesión de PEX.