# PRD — Atlante del Pacífico v2 ("upgraded"): broker de Pacific Experience + marketplace de charters

Versión: 2.0 · Fecha: 2026-09-09 · Autor: Claude para Mark · Estado: borrador para aprobación
Fuentes: `01-analisis-broker-2026-09-09.md` (recorrido en vivo de ambos sitios) + auditoría del repo `github.com/mharr92-hub/atlante` (rama `main`, commit `aaa2303`) + proyecto Supabase "ATLANTE". Lo no verificado está marcado NO VERIFICADO; lo que decide Mark está marcado PENDIENTE MARK. Nada de este documento se inventa: los precios y textos de PEX son los publicados el 09/09/2026.

## 0. Objetivo en una frase

Que cada persona que entra a atlantedelpacifico.lat termine pagando en pacificexperience.lat con el código de Atlante (`ref=ATLANTE&ref_id=<lead>`), o cerrando un charter (PEX por deep-link, aliados por cotización) desde Atlante — y que Mark pueda ver en un tablero cuántas ventas y cuánta comisión generó Atlante.

| Métrica norte | Definición | Cómo se mide |
|---|---|---|
| Reservas PEX atribuidas | Reservas pagadas en PEX cuyo `referral_code` = ATLANTE | Export semanal de PEX (manual) → webhook (R1b) |
| Tasa de handoff | Leads que llegan al paso 3 y son redirigidos a PEX ÷ visitas a fichas | Evento `redirect_to_pex` / `view_product` |
| Charters cerrados | Cotizaciones de naves aliadas que terminan en "pagado" + charters PEX con `BROKER=ATLANTE` | Estado del lead en admin |
| Comisión del mes | Σ monto × % por operador | Reporte `/admin/comisiones` |

## 1. Auditoría del repo (lo nuevo respecto al análisis)

Stack real: Next.js 16.2.10 (App Router, TypeScript) + React 19 + Tailwind v4 + Prisma 6 sobre Postgres. 5 commits, una sola rama `main`, ~4.500 líneas en `src/`. Sin tests, sin CI, sin `.env.example` (el README lo cita pero no existe en el repo).

| Área | Estado hoy (archivo) | Implicación para el PRD |
|---|---|---|
| Catálogo | `src/content/tours.ts`: 3 tours ($850 / $1,450 / $2,800 por persona) + 3 charters ($1,200 / $1,800 / $3,200 por barco, +$60–110 por invitado extra), capacidad 12 y depósito 30 % en todos. Todo hardcodeado e inventado | D3 y D6 confirmados. El catálogo pasa a base de datos con `fuente_url` + `verificado_el`; los 6 productos actuales se eliminan |
| Configuración | `src/config/site.ts`: `url: https://atlantedelpacifico.com`, `email: concierge@atlantedelpacifico.com`, `trust: {4.9, 127, 200, 14}` | D1, D2 y D4 salen de un solo archivo: canonical, sitemap, robots, OG y JSON-LD derivan de `site.url`. Arreglo de 1 archivo + borrar `trust` |
| Reseñas | `src/content/reviews.ts`: 3 testimonios con nombre y fuente "Google"/"TripAdvisor" + `aggregateRating {4.9, 127}` inyectado como JSON-LD `TravelAgency.aggregateRating` en el home | D4 confirmado y agravado: rich results de Google con reseñas inventadas (riesgo de penalización manual). Se elimina el archivo y el JSON-LD de rating |
| Urgencia | `TourCard` prop `urgency` + `i18n.spots_left` = "Pocos cupos esta semana" | D5 confirmado. Se elimina la prop y la clave |
| `/api/lead` | Stub: valida el email, hace `console.log` y responde `{ok:true, code:"ATLANTE10"}`; el popup promete "10 % en tu primera reserva" | D8 confirmado + promesa falsa: el código ATLANTE10 no existe en ningún checkout (el pago es en PEX). El popup se apaga hasta que exista un beneficio real |
| `/api/bookings` | Exige `DATABASE_URL` (503 si falta); crea `Booking` vía Prisma con precio recalculado del catálogo inventado y abre WhatsApp | D7 confirmado. El proyecto Supabase "ATLANTE" (`odeivsrdtgernzndwnmm`, us-east-1) está **INACTIVE (pausado)**: hoy no puede persistir nada. `DATABASE_URL` en Vercel: NO VERIFICADO |
| Modelo de datos | `prisma/schema.prisma`: `Booking` ya tiene `referralCode`, `utmSource/Medium/Campaign`, `selectedAddons`; existen `Reseller` (código + % comisión), `Lead` (email único, newsletter), `Coupon`, `GiftCard`, `Review`, `AvailabilitySlot`, `Payment` | Buena base. Faltan `Product`, `ProductAddon`, `Vessel`, `Operator`, `Handoff`, `PexEvent` y un `Lead` de intención de compra (el actual es de newsletter) |
| Admin | `/admin` con contraseña única + cookie HMAC (`ADMIN_PASSWORD`, `AUTH_SECRET`); vistas resumen, reservas y calendario de cupos; acciones confirmar / marcar pagado / cancelar | Se reutiliza tal cual para leads, catálogo, naves y comisiones. No hace falta auth externo |
| Analítica | `Analytics.tsx` carga GA4 y Meta Pixel sólo si existen `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | D10 es configuración, no código. Faltan eventos por paso y el `linker` cross-domain hacia pacificexperience.lat |
| Idioma | ES/EN por cookie `locale`; sin `hreflang`. Copy EN usa "Sunset Voyage", "Private Sunset Charter", keyword "sunset cruise Panama City", filtro "Sunset" | D13 + violación de la regla "nunca Sunset" (10 apariciones en `tours.ts`, `reviews.ts`, `i18n.ts`, `layout.tsx` y `Destinations.tsx`) |
| Moneda | `lib/format.ts` con tasas fijas EUR 0.92 / COP 4050 / MXN 17.1 aplicadas en cliente | D12 confirmado. Se deja sólo USD (el pago en PEX es en USD) |
| SEO técnico | `sitemap.ts` y `robots.ts` construyen URLs con `site.url` (.com); JSON-LD `TouristTrip` con `Offer.price` inventado en cada ficha | D1 confirmado; el JSON-LD sólo se emite con precio real |
| Seed | `prisma/seed.ts`: 60 días de cupos para los 6 productos inventados + cupón WELCOME10 | Se reemplaza por un seed del catálogo PEX marcado `verificado_el` |
| Cierre actual | Todo termina en `wa.me/50768603623` con mensaje prearmado; `ContactSection` no guarda nada | El WhatsApp de Atlante se mantiene como canal de rescate; deja de ser el único cierre |

## 2. Principios de producto (no negociables)

| # | Principio | Consecuencia en el producto |
|---|---|---|
| 1 | Atlante nunca cobra al cliente final | Sin pasarela, sin formulario de tarjeta, sin SDK de pagos. El pago ocurre en PEX (tours, ferry, naves PEX) o con el operador aliado (naves de terceros) |
| 2 | Toda salida a PEX lleva nuestro código | `ref=ATLANTE&ref_id=<lead_id>` + UTM en el 100 % de los enlaces a pacificexperience.lat, generados por un único helper `buildPexUrl()`. Ningún `href` a PEX escrito a mano (lint + test lo verifican) |
| 3 | Lead antes de redirigir | Nombre + WhatsApp + producto + fecha se guardan en Atlante antes del handoff; si el cliente abandona en PEX, se rescata desde el WhatsApp de Atlante |
| 4 | Paridad con PEX | Mismo precio, mismas políticas (100 % al reservar tours; reembolso sólo hasta 24 h antes; charters 30 % de apartado y saldo 24 h antes). Cualquier diferencia rompe la confianza y la comisión no justifica el margen |
| 5 | Cero datos inventados en público | Un precio, cupo, reseña o métrica sólo se muestra si tiene `fuente_url` y `verificado_el`; si no, no se muestra |
| 6 | Sin datos personales en la URL | El prellenado en PEX viaja por token de un solo uso (`h=`), nunca nombre/correo/teléfono en query string |
| 7 | Transparencia | "Agente autorizado de Pacific Experience. La reserva y el pago se completan en pacificexperience.lat" visible en catálogo, paso 3 y footer |
| 8 | Marca propia | Atlante es un broker/concierge marítimo que compara y elige; WhatsApp y correo propios, distintos a los de PEX. Nunca la palabra "Sunset" |

## 3. Usuarios y trabajos por hacer

| Usuario | Qué busca | Cómo lo resuelve Atlante v2 | Cierre |
|---|---|---|---|
| Turista o local buscando "tour a Taboga", "ferry", "party en barco" | Comparar rápido y reservar sin fricción | Catálogo PEX con precio real, próxima salida y funnel de 3 clics | Paga en PEX con `ref=ATLANTE` |
| Grupo para cumpleaños, despedida, corporativo, propuesta | Ver opciones de yate, precio por persona y disponibilidad | `/charters` con filtros, comparador y precio por persona calculado | Nave PEX → checkout PEX; nave aliada → cotización |
| Operador de charter aliado | Leads calificados sin invertir en marketing | Ficha en el marketplace + formulario "publica tu embarcación" | Cobra al cliente y paga comisión a Atlante |
| Hotel, concierge, agencia | Recomendar con comisión y sin operar nada | Código de aliado (`Reseller.referralCode`) que viaja en el lead | Comisión repartida en el reporte mensual |
| Mark (admin) | Ver leads, atribución y comisión sin hojas sueltas | `/admin/leads`, `/admin/catalogo`, `/admin/naves`, `/admin/comisiones` + export CSV | — |

## 4. Alcance por release

| Release | Nombre | Contenido | Dónde | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| R0 | Limpieza y verdad | D1 dominio .lat en `site.ts`; D2 email; D4/D5 borrar reseñas, métricas, urgencia y JSON-LD de rating; D12 sólo USD; apagar popup ATLANTE10; quitar "Sunset"; disclosure PEX; páginas legales BORRADOR; `.env.example` | Atlante | 1–2 días | P0 |
| R1 | Ticketería PEX — modo puente | Catálogo PEX en DB con `verificado_el`; funnel `/reservar/[slug]` 3 pasos; `Lead` + `Handoff`; `buildPexUrl()`; pantalla "Te llevamos a Pacific Experience" + código visible para pegar; admin de leads; eventos de analítica | Atlante | 5–7 días | P0 |
| R1b | Cambios mínimos en PEX | Leer `ref`/`ref_id` por URL → prellenar y persistir `referral_code`; cookie 30 días; feed público `trips/slots`; prefill por token; webhook de confirmación; `addon=`; calendario en vez de píldoras | PEX (otro repo, otra sesión) | 3–4 días | P0 |
| R1c | Ticketería PEX — modo integrado | Sync del feed (cron) → fechas y cupos reales en el paso 2; deep-link directo al checkout con `slot_id`; estado `pagado` automático por webhook; reporte de comisiones | Atlante | 3–4 días | P0 (cuando exista R1b) |
| R2 | Marketplace de charters | `Vessel` + `Operator`; `/charters` con filtros y comparador; fichas Aura / Pacific Ferry 1 / Sirena del Mar (datos de PEX); modo `deeplink` vs `cotizacion`; `partner_applications`; admin de naves con `comision_pct` | Atlante | 4–6 días | P1 |
| R3 | Alianzas | Códigos de aliado (hoteles, agencias) que viajan en el lead; landing `/aliados`; contrato tipo; kit de operador | Atlante + comercial | 2–3 días + continuo | P1 |
| R4 | Crecimiento | `/destinos/*`, hreflang + EN completo, GA4 linker + Meta, guías comparativas, ads segmentados por marca, GBP (si aplica) | Atlante + PEX | Continuo | P2 |

Regla de trabajo (heredada de PEX): escritor único, rama `feature/atlante-broker` desde `origin/main`, commits en español, sin merge ni deploy sin aprobación de Mark, verificación en 3 niveles (SHA + build de Vercel + dominio en vivo).

## 5. Especificación funcional

### 5.1 Mapa de rutas

| Ruta | Qué muestra | Fuente de datos | CTA principal | Cambio vs hoy |
|---|---|---|---|---|
| `/` | Hero de broker ("comparamos ferry, tours y charters de operadores verificados y te llevamos al pago directo con el operador"), dos entradas: "Tickets y tours" y "Charters"; bloque "Agente autorizado de Pacific Experience"; destinos; cómo funciona; FAQ; contacto | Catálogo en DB | Ver tours / Ver charters | Quitar reseñas, métricas de confianza, urgencia y JSON-LD de rating; separar los dos portales |
| `/tours` | Catálogo PEX: Ferry Taboga, Tour por la Bahía, Party en la Bahía (+ Contadora oculto hasta que esté disponible) con precio real, duración, días de salida, próxima salida y cupos (modo integrado) | `Product` (`source=pex`) | Reservar → `/reservar/[slug]` | Nueva página (hoy es una sección del home con productos inventados) |
| `/tours/[slug]` | Ficha del producto PEX: fotos, itinerario, incluye, políticas de PEX, "quién opera / quién cobra" | `Product` | Reservar | Deja de mezclar charters; galería con fotos reales de PEX (mismo dueño) |
| `/reservar/[slug]` | Funnel de 3 pasos (5.2) | `Product`, `ProductAddon`, feed (R1c) | Continuar al pago en Pacific Experience | Nuevo; reemplaza `PriceCalculator` |
| `/reservar/[slug]/listo` | Pantalla de redirección: resumen + "Tu código: ATLANTE" + salto automático a PEX | `Lead`, `Handoff` | Automático (2 s) + botón manual | Nuevo |
| `/charters` | Listado de naves (PEX + aliadas) con filtros y comparador | `Vessel`, `Operator` | Reserva directa (PEX) / Cotizar (aliado) | Nuevo; hoy los charters viven bajo `/tours/` |
| `/charters/[slug]` | Ficha estándar de nave (5.7) | `Vessel` | Igual | Nuevo |
| `/charters/comparar` | Comparador real (hasta 4 naves, precio por hora y por persona) | `Vessel` | Ver ficha | Reemplaza `/compare` (301) |
| `/cotizar/[slug]` | Formulario de cotización de nave aliada | `Vessel` | Enviar → lead `charter_partner` + WhatsApp | Nuevo |
| `/aliados`, `/aliados/registro` | Propuesta para operadores, hoteles y agencias; alta self-service | `PartnerApplication` | Registrarme | Nuevo |
| `/como-funciona`, `/terminos`, `/privacidad`, `/cancelaciones` | Textos legales y explicación de los 3 clics | Estático (BORRADOR — revisar Mark) | — | Nuevo (D11) |
| `/destinos/[slug]` | Taboga, Las Perlas, Bahía: "todas las formas de ir" | `Product` + `Vessel` | Tour / ferry / charter | R4 |
| `/admin/leads`, `/admin/catalogo`, `/admin/naves`, `/admin/operadores`, `/admin/aliados`, `/admin/comisiones` | Gestión y reporte | Prisma | — | Extiende el admin existente (misma auth) |
| `POST /api/leads` | Crea `Lead` + `Handoff`, devuelve `destinationUrl` | — | — | Reemplaza `/api/bookings` |
| `GET /api/handoff/[token]` | Prellenado para PEX (servidor a servidor, con secreto) | `Handoff` | — | Nuevo |
| `POST /api/pex/booking-confirmed` | Webhook firmado de PEX | `PexEvent` → `Lead` | — | Nuevo (R1c) |
| `POST /api/partner-applications` | Alta de operador | `PartnerApplication` | — | Nuevo |
| `GET /api/cron/sync-pex` | Copia el feed de PEX a `Product`/`ProductSlot` | Feed PEX | — | R1c (Vercel Cron, cada 15 min) |
| Redirecciones 301 | `/compare` → `/charters/comparar`; `/tours/charter-*` y `/tours/yate-*` → `/charters`; `/tours/travesia-al-atardecer`, `/tours/escape-a-taboga`, `/tours/expedicion-a-las-perlas` → `/tours` | `next.config.ts` | — | Evita 404 en URLs ya indexadas |

`noindex` en `/reservar/*/listo`, `/cotizar/*` y `/admin/*`.

### 5.2 Funnel de 3 clics — `/reservar/[slug]`

| Paso | Pantalla | Campos | Validaciones | Estado en URL |
|---|---|---|---|---|
| 1 · Tour | Viene de la ficha o del catálogo; cabecera fija con nombre, precio real, duración y "Pago seguro en Pacific Experience" | `slug` | Producto `disponible = true` y con precio verificado; si no, 404 amigable con enlace al catálogo | `/reservar/tour-bahia` |
| 2 · Fecha y pasajeros | Calendario + selector de horario + cantidad por categoría + adicionales | `date`, `slot` (horario), `pax` por categoría (adulto / niño / jubilado según el producto), `addons[]` | Ver tabla "Modo puente vs integrado" | `?date=2026-09-18&slot=17:30&pax=2&addons=tour-islas` |
| 3 · Datos | Resumen (producto, fecha, horario, pax, adicionales, total estimado) + formulario | `nombre`, `whatsapp` (E.164, prefijo +507 por defecto), `email`, `partner_code` (opcional, prellenado desde `?partner=` o cookie), checkbox "Acepto las políticas de Pacific Experience y que Atlante transfiera mis datos a PEX para completar la reserva" | Nombre ≥ 2 palabras; WhatsApp válido; email válido; checkbox obligatorio | Igual que el paso 2 |
| → Redirección | "Te llevamos a Pacific Experience para completar tu pago" con resumen, cuenta regresiva de 2 s, botón "Ir ahora" y la línea "Tu código de referido es **ATLANTE** — si el checkout te lo pide, pégalo" con botón copiar | — | Si `POST /api/leads` falla, se redirige igual con `ref=ATLANTE` sin `ref_id` y se registra el error; el handoff nunca se bloquea | `/reservar/tour-bahia/listo?lead=…` |

| Aspecto | Modo puente (R1, sin feed de PEX) | Modo integrado (R1c, con feed + token + webhook) |
|---|---|---|
| Fechas | Calendario simple; sólo se habilitan los días de la semana publicados por PEX (Tour Bahía: vie · sáb · dom desde 18/09/2026; Party: vie · sáb; Ferry: diario) | Sólo días con salida real habilitados; el calendario abre en el mes de la próxima salida y la preselecciona |
| Horarios | Lista fija del producto (p. ej. 5:30–7:00 PM y 8:00–9:30 PM) | Horarios del día según feed, con cupos por salida |
| Cupos | No se muestran; aviso "La disponibilidad final se confirma en Pacific Experience" | Se muestran; si `pax` > cupo, se bloquea el paso 3 y se ofrecen las 3 próximas fechas con cupo |
| Destino del handoff | Página del producto en PEX (`/tours/<trip_id>`) o `/ferry/taboga`, con `ref`, `ref_id`, UTM. El cliente elige fecha en PEX | Checkout directo `/tours/checkout?trip_id&slot_id&date&tickets` + `h=<token>` |
| Prellenado en PEX | Ninguno (PEX aún no lee parámetros); el cliente pega ATLANTE en "Código de referido" (por eso se muestra y se copia en la pantalla de redirección) | PEX lee `ref`, `ref_id`, `tickets`, `addon` y resuelve `h` para nombre, correo y teléfono |
| Conversión | Mark la marca a mano en `/admin/leads` con el export de PEX (`referral_code = ATLANTE`) | Webhook `booking.paid` → `Lead.status = paid` + comisión calculada |

Rescate del abandono: si un lead queda en `redirected` sin `paid` (24 h en modo integrado; revisión manual en modo puente), el admin muestra un botón "WhatsApp" que abre `wa.me` desde el número de Atlante con plantilla: "Hola {nombre}, soy {concierge} de Atlante. Vi que empezaste tu reserva de {producto} para el {fecha}. ¿Te ayudo a completarla? Aquí tienes el enlace directo: {url con ref}".

### 5.3 `buildPexUrl()` — el único punto de salida a PEX

Archivo: `src/lib/pex.ts`. Base: `process.env.NEXT_PUBLIC_PEX_BASE_URL` (por defecto `https://www.pacificexperience.lat`). Firma:

```
buildPexUrl({
  target: "tour_checkout" | "tour_page" | "ferry_page" | "charter_checkout" | "charter_page" | "home",
  tripId?, slotId?, date?, tickets?, vessel?, addons?: string[],
  leadId?, handoffToken?, campaign?
}) => string
```

Siempre añade `ref=ATLANTE`, `ref_id=<leadId>` (si existe), `utm_source=atlante`, `utm_medium=referral`, `utm_campaign=<campaign | slug>`; añade `h=<token>` sólo en modo integrado y `addon=<slug>` por cada adicional. Nunca incluye nombre, correo ni teléfono.

| Caso | URL generada (ejemplo) | Verificación |
|---|---|---|
| Tour por la Bahía — puente | `https://www.pacificexperience.lat/tours/<trip_id>?ref=ATLANTE&ref_id=ld_8f3…&utm_source=atlante&utm_medium=referral&utm_campaign=tour-bahia` | Ruta de producto observada en PEX |
| Tour por la Bahía — integrado | `…/tours/checkout?trip_id=<id>&slot_id=<id>&date=2026-09-18&tickets=2&ref=ATLANTE&ref_id=ld_8f3…&h=<token>&utm_…` | `slot_id`, `trip_id`, `date` verificados el 09/09; `tickets`, `ref`, `h` requieren R1b |
| Party en la Bahía (Sirena del Mar) | `…/tours/c0d1a003-0000-4000-8000-000000000085?ref=ATLANTE&ref_id=…&utm_…` | ID de producto observado |
| Ferry Taboga | `…/ferry/taboga?ref=ATLANTE&ref_id=…&utm_…` | URL del checkout de ferry NO VERIFICADA → se enlaza la página del ferry |
| Chárter Aura | `…/charter/checkout?vessel=aura&ref=ATLANTE&ref_id=…&utm_…` | `vessel=aura` verificado; `pacific-ferry-1` y `sirena-del-mar` por analogía, NO VERIFICADO |
| Ferry Contadora + add-on | `…/ferry/contadora?addon=tour-islas&ref=ATLANTE&ref_id=…` | Producto `disponible=false` hasta que PEX lo active; ruta NO VERIFICADA |

Guardrails: test unitario "toda URL contiene `ref=ATLANTE`"; script `npm run check:pex-links` que falla si aparece el literal `pacificexperience.lat` fuera de `src/lib/pex.ts`; los enlaces del footer/header a PEX también pasan por el helper.

### 5.4 Handoff por token (prellenado sin datos personales en la URL)

| Elemento | Especificación |
|---|---|
| Modelo | `Handoff { token (32 bytes hex, único), leadId, expiresAt = creación + 30 min, usedAt }` |
| Creación | Al crear el lead en el paso 3; el token viaja en `h=` |
| Consulta | `GET /api/handoff/[token]` con cabecera `x-atlante-key: <PEX_HANDOFF_SECRET>`; responde `{ name, email, phone, tickets, addons, referral_code: "ATLANTE", ref_id }`; marca `usedAt`; 404 si usado o vencido; sin registro de PII en logs |
| Lado PEX | Si el checkout recibe `h`, lo resuelve en el servidor y prellena nombre, correo, teléfono y `referral_code`; si falla, el checkout funciona igual con `ref` |
| Seguridad | Token de un solo uso, secreto compartido en variables de entorno de ambos proyectos, rate-limit por IP, sin CORS abierto |

### 5.5 Webhook de confirmación PEX → Atlante (R1c)

| Elemento | Especificación |
|---|---|
| Endpoint | `POST /api/pex/booking-confirmed` |
| Cuerpo | `{ event: "booking.paid", pex_booking_id, ref, ref_id, product: { type: "tour"/"ferry"/"charter", id, name }, service_date, tickets, amount, currency: "USD", paid_at, customer_email_sha256 }` — sin datos de tarjeta, sin nombre |
| Firma | Cabecera `x-pex-signature = HMAC-SHA256(timestamp + "." + body, PEX_WEBHOOK_SECRET)` + `x-pex-timestamp` (rechazar > 5 min) |
| Idempotencia | `PexEvent.pexBookingId` único; reenvíos devuelven 200 sin duplicar |
| Efecto | Lead con `ref_id` → `status = paid`, `amount`, `commissionAmount = amount × pct` (pct del producto o global). Sin `ref_id` → intenta emparejar por `customer_email_sha256` + fecha; si no, crea lead `paid_unmatched` para revisión manual |
| Eventos | `booking.cancelled` y `booking.refunded` revierten la comisión |

### 5.6 Catálogo PEX en base de datos

| Campo de `Product` | Ejemplo (Tour por la Bahía, observado el 09/09/2026) |
|---|---|
| `slug`, `kind` (`tour` / `ferry` / `party`), `source` = `pex` | `tour-bahia`, `tour`, `pex` |
| `pexTripId`, `pexPath` | `<trip_id de PEX>`, `/tours/<trip_id>` |
| `name`, `summary`, `description` (ES/EN JSON) | "Tour por la Bahía" |
| `priceFrom`, `priceUnit` (`per_person` / `per_segment` / `per_boat`), `priceTable` (JSON por categoría) | $25 · `per_person` |
| `durationMin` | 90 |
| `schedule` (JSON: días de semana, horarios, `validFrom`) | vie · sáb · dom; 17:30–19:00 y 20:00–21:30; desde 2026-09-18 |
| `capacityMin`, `capacityMax` | — / según feed |
| `includes`, `policies` (JSON) | Fee de puerto incluido; 100 % al reservar; reembolso sólo hasta 24 h antes |
| `addons` → `ProductAddon[]` | — |
| `images` (JSON) | Fotos de PEX (mismo dueño) |
| `available`, `verifiedAt`, `sourceUrl` | `true`, `2026-09-09`, `https://www.pacificexperience.lat/tours/<trip_id>` |
| `commissionPct` | PENDIENTE MARK (propuesta: 20, igual a B2B) |

| Producto inicial | Datos observados en PEX el 09/09/2026 | `available` |
|---|---|---|
| Ferry a Isla Taboga (boleto abierto) | Adulto nacional desde $10 por tramo; turista $12 entre semana / $15 fin de semana; niño y jubilado $8; entrada al puerto $1; sin hora fija, válido 180 días; salidas 5:45 AM – 3:35 PM desde Isla Perico | PENDIENTE MARK (en agosto quedó "pausado hasta nuevo aviso"; la web lo muestra activo) |
| Tour por la Bahía (Pacific Ferry 1) | $25 por persona; 1 h 30; 5:30–7:00 PM y 8:00–9:30 PM; vie/sáb/dom desde 18/09/2026; fee de puerto incluido | `true` |
| Party en la Bahía (Sirena del Mar) | Desde $35 por persona; 2 h 30; vie · sáb 7:00–9:30 PM; 30 a 80 personas; DJ, bebida de bienvenida, barra de pago | `true` |
| Ferry a Contadora | $130 registrado; "no disponible por el momento" en PEX; add-on "Tour por las islas del archipiélago — 4 h — +$50" (unidad PENDIENTE MARK) | `false` |
| Naves PEX (Aura, Pacific Ferry 1, Sirena del Mar) | En R1 se muestran como tarjetas simples con deep-link `charter_checkout` para no perder atribución; la ficha completa llega en R2 | `true` |

Sincronización: en R1 el catálogo se edita en `/admin/catalogo` y el script `npm run check:pex` compara precio y disponibilidad contra las páginas públicas de PEX y lista diferencias (no corrige solo). En R1c, `GET /api/cron/sync-pex` copia el feed (`/api/public/trips`, `/api/public/slots`) a `Product` y `ProductSlot` cada 15 min, con fallback al último snapshot si PEX no responde.

### 5.7 Marketplace de charters

| Campo de `Vessel` | Ejemplo Aura (observado en PEX) | Obligatorio |
|---|---|---|
| `name`, `type`, `lengthFt` | Aura · catamarán · eslora NO ENCONTRADA | Sí (eslora no) |
| `operatorId` → `Operator` (`pex` o aliado) | pex | Sí |
| `capacityMax`, `marina` | 35 · Marina Flamenco, Amador | Sí |
| `pricing` (JSON: duraciones y precio por barco) | 4 h · 8 h · 12 h; barco completo desde $1,300; desde $55/persona | Sí |
| `routes` (JSON) | Taboga, Bahía, Las Perlas | Sí |
| `includes`, `onRequest` (JSON) | Combustible, capitán y marino, hielo, nevera, toallas, agua y sodas, BBQ, piscina de mar, A/C, camarotes, baños y duchas, agua caliente, sonido · Bajo solicitud: snorkel, kayaks, sillas flotantes, pesca | Sí / No |
| `depositPct`, `cancellationPolicy` | 30 % de apartado; saldo 24 h antes | Sí |
| `photos` (mín. 8), `video` | 23 fotos en PEX | Sí |
| `closeMode` (`deeplink` / `quote`), `pexVesselSlug` | `deeplink`, `aura` | Sí |
| `commissionPct`, `contractSignedAt` (internos, nunca públicos) | 20 % PEX; aliados según acuerdo | Sí |
| `verified` (licencia AMP + seguro + contrato) | Checklist interno | — |

| Función | Descripción | Release |
|---|---|---|
| Listado con filtros | Capacidad, presupuesto, duración, ruta, tipo de nave, marina de salida; orden por precio por persona | R2 |
| Precio por persona calculado | Barco completo ÷ pax elegido (como hace PEX: "desde $55/persona") | R2 |
| Comparador | Hasta 4 naves: precio por hora, por persona, incluye / no incluye, capacidad | R2 |
| Badges | "Reserva directa" (PEX → checkout con `ref`) vs "Cotizar" (aliado → `/cotizar/[slug]`) | R2 |
| Cotización de nave aliada | Lead `charter_partner` con fecha, horas, pax, ocasión y datos → WhatsApp del concierge (SLA 2 h) → propuesta PDF con precio del operador sin recargo visible → el operador cobra al cliente → comisión a fin de mes contra factura | R2 |
| Alta de operador | `/aliados/registro` → `PartnerApplication` en borrador para revisión de Mark | R2 |
| Ocasiones | Landings por ocasión (cumpleaños, despedida, corporativo, propuesta de matrimonio, atardecer) | R4 |
| Disponibilidad | PEX: del feed; aliados: "consultar" con tiempo de respuesta real; bloqueos por iCal cuando haya 3+ operadores | R4 |

Motivo de que cobre el operador: Atlante no maneja dinero de clientes, no necesita pasarela ni fianza y la responsabilidad del servicio (seguro, licencia AMP, tripulación) queda en quien opera la nave.

### 5.8 Leads y administración

| Estado del lead | Cuándo | Quién lo cambia |
|---|---|---|
| `created` | Se envía el paso 3 | Sistema |
| `redirected` | Se dispara la redirección a PEX | Sistema |
| `paid` | PEX confirma el pago (webhook) o Mark lo marca con el export de PEX | Sistema / Mark |
| `paid_unmatched` | Webhook sin `ref_id` que no empareja con ningún lead | Sistema → revisión |
| `lost` | 7 días sin pago, o el cliente lo dice | Mark / regla automática |
| `quote_requested` → `quoted` → `accepted` → `paid` / `lost` | Charters de aliados | Concierge |

Vistas de admin: `/admin/leads` (filtros por estado, tipo, fecha, producto, aliado; detalle; botón WhatsApp de rescate; marcar pagado con `pex_booking_id` y monto; export CSV), `/admin/catalogo` (CRUD de productos y adicionales con `verificado_el` visible y aviso cuando pasan 14 días sin verificar), `/admin/naves` y `/admin/operadores` (CRUD, `comision_pct`, estado), `/admin/aliados` (solicitudes y códigos), `/admin/comisiones` (mes, operador, reservas, monto, %, comisión; export CSV para Sheets).

### 5.9 Alianzas y códigos de aliado

Se reutiliza el modelo `Reseller` existente (nombre, email, `referralCode`, `commissionPercent`). Un enlace `atlantedelpacifico.lat/?partner=HOTELX` guarda una cookie de 30 días; el código viaja en `Lead.partnerCode`. PEX sigue recibiendo `ref=ATLANTE` (un solo código que PEX conoce); el reparto de comisión entre Atlante y el aliado se calcula en `/admin/comisiones`. Landing `/aliados` con tres propuestas: operadores de charter (ficha + leads, comisión 10–20 % PENDIENTE MARK), hoteles y concierges (código + parte de la comisión), agencias y DMC (tarifa neta = B2B de PEX 20 %). Los ~62 prospectos ya compilados para PEX se pueden trabajar desde la marca Atlante.

### 5.10 Confianza, marca y legal

| Tema | Especificación |
|---|---|
| Disclosure | ES: "Atlante del Pacífico es agente autorizado de Pacific Experience. La reserva y el pago se completan en pacificexperience.lat." EN: "Atlante del Pacífico is an authorized agent of Pacific Experience. Booking and payment are completed on pacificexperience.lat." — visible en `/tours`, paso 3, pantalla de redirección y footer. Logo de PEX sólo si Mark lo autoriza (PENDIENTE MARK) |
| Reseñas | Sólo reales y con fuente. Opción: incrustar el widget de Google de PEX en las fichas de productos PEX con el rótulo "Reseñas del operador (Google, 5.0 · 9)". Sin testimonios propios hasta tenerlos |
| Métricas de confianza | Se eliminan (4.9 / 127 / +200 / 14 min). Se pueden mostrar hechos verificables: "Pago directo con el operador", "Precio igual al del operador", "Respuesta por WhatsApp en horario X" (X PENDIENTE MARK) |
| Popup de descuento | Se apaga: no existe cupón canjeable en PEX. Se reactiva sólo si PEX crea un beneficio real por `ref=ATLANTE` |
| Textos legales | `/terminos` (rol de intermediario; quién opera; quién cobra; responsabilidad del operador), `/privacidad` (datos del lead, transferencia a PEX, cookies, analítica), `/cancelaciones` (espejo de PEX + regla por operador aliado), `/como-funciona` (los 3 clics). Todos marcados BORRADOR — revisar Mark |
| Identidad del negocio | Razón social y RUC de la entidad que factura comisiones en footer y términos (PENDIENTE MARK) |
| Contacto | WhatsApp de Atlante +507 6860 3623 (distinto al de PEX); email real PENDIENTE MARK (hoy apunta a un dominio inexistente) |
| Palabra prohibida | "Sunset" no aparece en ningún texto público (ES ni EN) |

### 5.11 SEO e idiomas

| Elemento | Especificación |
|---|---|
| Canonical / sitemap / robots | `site.url = https://www.atlantedelpacifico.lat`; sitemap con `/tours/*`, `/charters/*`, `/destinos/*`, legales; robots con `Disallow: /admin`, `/reservar/*/listo`, `/cotizar` |
| Redirecciones | Las 301 de 5.1 en `next.config.ts` |
| hreflang | `<link rel="alternate" hreflang="es|en">` con rutas `/en/*` cuando el EN esté completo (R4); mientras tanto, `x-default = es` |
| JSON-LD | `Organization` (Atlante, contacto real), `TouristTrip` + `Offer` sólo con precio verificado; `Product` para naves; nunca `aggregateRating` sin reseñas reales |
| Palabras clave de broker | "alquiler de yate en Panamá precios", "mejores charters Panamá", "comparar tours a Taboga", "cómo llegar a Taboga", "yate para cumpleaños Panamá", "charter Las Perlas" — PEX se queda con marca + producto |
| Search Console | Alta del dominio .lat y envío del sitemap tras el deploy de R0 |
| Dominio .com | Comprar y redirigir 301 al .lat, o eliminar toda referencia (PENDIENTE MARK). Hoy el .com no resuelve |

### 5.12 Analítica y atribución

| Evento | Cuándo | Parámetros |
|---|---|---|
| `view_catalog` | Carga de `/tours` o `/charters` | `portal` |
| `view_product` | Ficha de producto o nave | `slug`, `source` |
| `funnel_step` | Cada paso del funnel | `slug`, `step` (1–3) |
| `lead_created` | `POST /api/leads` ok | `lead_id`, `slug`, `pax`, `value` (total estimado) |
| `redirect_to_pex` | Salto a PEX | `lead_id`, `target`, `mode` (puente / integrado) |
| `quote_requested` | Cotización de nave aliada | `vessel`, `pax`, `hours` |
| `whatsapp_click` | Cualquier `wa.me` | `context` |
| `purchase` (en PEX) | Página de éxito de PEX con `ref=ATLANTE` | `transaction_id`, `value` — requiere linker cross-domain (R1b) |

GA4 con `linker: { domains: ["pacificexperience.lat"] }`; Meta Pixel con evento `Lead` en el paso 3; UTM fijas (`utm_source=atlante`, `utm_medium=referral`, `utm_campaign=<slug>`); en Google Ads, Atlante puja por términos de comparación/charter y PEX por marca/producto (nunca los dos por lo mismo); remarketing de Meta a quienes hicieron `redirect_to_pex` sin `purchase`.

## 6. Modelo de datos (Prisma, Postgres en Supabase "ATLANTE")

| Modelo | Campos clave | Nota |
|---|---|---|
| `Product` (nuevo) | `slug`, `kind`, `source`, `pexTripId`, `pexPath`, `name/summary/description` (JSON ES/EN), `priceFrom`, `priceUnit`, `priceTable` (JSON), `durationMin`, `schedule` (JSON), `capacityMin/Max`, `includes` (JSON), `policies` (JSON), `images` (JSON), `available`, `verifiedAt`, `sourceUrl`, `commissionPct`, `order` | Reemplaza `src/content/tours.ts` |
| `ProductAddon` (nuevo) | `productId`, `slug`, `name` (JSON), `description`, `price`, `unit` (`per_person` / `per_booking`), `durationMin`, `active`, `order` | Primer registro: tour por las islas (Contadora) +$50 |
| `ProductSlot` (nuevo, R1c) | `productId`, `pexSlotId`, `date`, `startTime`, `endTime`, `capacityRemaining`, `price`, `syncedAt` | Copia del feed; sustituye `AvailabilitySlot` para productos PEX |
| `Vessel` (nuevo) | Ver 5.7 | — |
| `Operator` (nuevo) | `name`, `slug`, `whatsapp`, `email`, `commissionPct`, `contractSignedAt`, `ampLicense`, `insuranceUntil`, `verified`, `active` | `pex` es el primer registro |
| `PartnerApplication` (nuevo) | `name`, `vesselName`, `capacity`, `zone`, `whatsapp`, `photos` (JSON), `status` (`new` / `reviewing` / `approved` / `rejected`) | — |
| `Lead` (rediseñado) | `type` (`tour` / `ferry` / `party` / `charter_pex` / `charter_partner`), `productId?`, `vesselId?`, `serviceDate`, `timeSlot`, `pax` (JSON por categoría), `addons` (JSON), `name`, `email`, `phone`, `partnerCode?`, `utmSource/Medium/Campaign`, `landingPath`, `destinationUrl`, `status`, `pexBookingId?`, `amount?`, `commissionAmount?`, `createdAt`, `redirectedAt`, `paidAt` | El `Lead` actual (email único de newsletter) pasa a llamarse `Subscriber` |
| `Handoff` (nuevo) | `token` (único), `leadId`, `expiresAt`, `usedAt` | Ver 5.4 |
| `PexEvent` (nuevo) | `pexBookingId` (único), `eventType`, `payload` (JSON), `signatureOk`, `leadId?`, `createdAt` | Log del webhook |
| `Reseller` (existente) | Sin cambios | Códigos de hoteles / agencias |
| `Booking`, `Payment`, `AvailabilitySlot`, `Coupon`, `GiftCard`, `Review` (existentes) | Se conservan pero dejan de usarse en el flujo público | Se pueden retirar en una limpieza posterior; no bloquean |

Migraciones: `prisma migrate dev --name broker_v2` en local contra una rama de Supabase o la DB restaurada; `prisma migrate deploy` en Vercel (`DATABASE_URL` = pooler 6543, `DIRECT_URL` = 5432). Verificar el número máximo de migración contra `origin/main` antes de crear una nueva; nunca re-ejecutar seeds no idempotentes contra producción.

## 7. Requiere cambio en PEX (anexo para la sesión de código de PEX)

| # | Cambio en PEX | Especificación mínima | Prioridad |
|---|---|---|---|
| X1 | Leer `ref` y `ref_id` por URL en `/tours/checkout`, `/charter/checkout` y la compra de ferry | Prellenar el campo existente `referral_code` con `ref`; guardar `ref`, `ref_id` y `utm_*` en la orden; cookie `pex_ref` de 30 días para que la atribución sobreviva si el cliente vuelve directo | P0 |
| X2 | Aceptar `tickets` (y categorías) en el checkout de tours | Prellenar la cantidad; validar contra cupo | P0 |
| X3 | Prellenado por token `h` | Si llega `h`, `GET https://www.atlantedelpacifico.lat/api/handoff/<h>` con `x-atlante-key`; prellenar nombre, correo, teléfono y `referral_code`; si falla, continuar sin prellenar | P0 |
| X4 | Feed público sólo lectura | `GET /api/public/trips` (id, nombre, tipo, precio por categoría, duración, capacidad, políticas, imágenes) y `GET /api/public/slots?trip_id=&from=&to=` (id, fecha, hora, cupos, precio); cache 60 s; sin datos personales | P0 |
| X5 | Webhook de conversión | `POST https://www.atlantedelpacifico.lat/api/pex/booking-confirmed` firmado (5.5) al confirmar pago, cancelar o reembolsar cuando `referral_code = ATLANTE` | P0 |
| X6 | Página de éxito con evento cross-domain | Disparar `purchase` en GA4/Meta con el `client_id` recibido por el linker; aceptar `_gl` en la URL | P1 |
| X7 | Add-on en el ferry de Contadora | Mostrar "Tour por las islas — 4 h — +$50" y leer `addon=tour-islas` para dejarlo premarcado | P1 (cuando Contadora se active) |
| X8 | Calendario en `/ferry/bahia` | Reemplazar las píldoras de fechas por un calendario con sólo días con salida habilitados, abierto en el mes de la próxima salida; si no hay salida, ofrecer las 3 próximas | P1 (mejora propia de PEX) |
| X9 | Registro del broker en charters | En la hoja de disponibilidad de charters, columna `BROKER = ATLANTE` para reservas que lleguen con `ref=ATLANTE` | P1 |

## 8. Criterios de aceptación (QA antes de cada merge)

| # | Criterio | Cómo se verifica |
|---|---|---|
| A1 | Ningún texto, precio, reseña o métrica sin fuente en público | `grep` de los valores inventados (850, 1450, 2800, 127, 4.9, "Pocos cupos", ATLANTE10) devuelve 0 resultados en `src/`; JSON-LD sin `aggregateRating` |
| A2 | Canonical, sitemap y robots apuntan a `https://www.atlantedelpacifico.lat` | `curl` a `/robots.txt`, `/sitemap.xml` y `view-source` del home |
| A3 | Toda URL a PEX contiene `ref=ATLANTE` y, si hay lead, `ref_id` | Test unitario de `buildPexUrl()` + `npm run check:pex-links` en CI |
| A4 | Funnel: 3 clics → lead guardado → redirección con parámetros correctos y `addon=` cuando aplica | Test e2e (Playwright) en preview de Vercel |
| A5 | El handoff nunca se bloquea si la DB falla | Test con `DATABASE_URL` inválida: redirige con `ref=ATLANTE` y registra el error |
| A6 | No existe ruta de pago, formulario de tarjeta ni SDK de pasarela en Atlante | `grep -ri "stripe\|paguelo\|yappy\|card_number"` = 0 |
| A7 | Días sin salida no seleccionables; el calendario abre en la próxima salida (modo integrado) | Prueba manual + captura móvil 390 px |
| A8 | Sin la palabra "Sunset" en ES ni EN | `grep -ri sunset src/` = 0 fuera de identificadores internos |
| A9 | Lighthouse móvil ≥ 85 en rendimiento y accesibilidad en `/`, `/reservar/[slug]`, `/charters` | Lighthouse CI en preview |
| A10 | Admin protegido | `/admin/*` sin cookie → redirige a login; APIs de admin verifican `requireAdmin()` |
| A11 | Webhook rechaza firmas inválidas y reenvíos duplicados | Test unitario con firma mala, timestamp viejo y `pex_booking_id` repetido |
| A12 | Build limpio y deploy verificado en 3 niveles | SHA en la rama + build de Vercel + dominio en vivo |

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| PEX tarda en implementar X1–X5 | Sin atribución automática ni fechas reales | Modo puente desde R1: código visible para pegar + conciliación manual con el export de PEX; rescate por WhatsApp |
| El cliente no pega el código en PEX (modo puente) | Comisión perdida | Pantalla de redirección con el código copiado al portapapeles; mensaje de WhatsApp de seguimiento con el enlace `ref`; X1 lo elimina |
| Catálogo desactualizado frente a PEX | Precio distinto → reclamo | `verificado_el` visible en admin, aviso a los 14 días, `npm run check:pex`; en R1c el feed manda |
| Google penaliza por reseñas/ratings inventados ya indexados | Pérdida de tráfico | R0 elimina el JSON-LD de rating y las reseñas; solicitar re-rastreo en Search Console |
| Supabase pausado o `DATABASE_URL` sin configurar en Vercel | Leads no se guardan | Restaurar el proyecto (o crear uno nuevo) antes de R1; health-check `/api/health` que reporta DB ok; el handoff nunca depende de la DB |
| Dos marcas del mismo dueño compitiendo en Ads | Costo duplicado | Reparto de palabras clave (5.12); nunca pujar los dos por el mismo término |
| Responsabilidad ante el consumidor (ACODECO) por servicios de terceros | Reclamos | Disclosure clara, Atlante nunca cobra, contrato de comisión con cada operador, sello "verificado" sólo con licencia y seguro |
| Datos personales en URLs o logs | Privacidad | Token de handoff; sin PII en query strings ni en logs; política de privacidad publicada |

## 10. Decisiones PENDIENTE MARK

| # | Decisión | Opciones | Efecto si no se decide |
|---|---|---|---|
| 1 | Comisión Atlante → PEX | 20 % (igual a B2B) / otro | Se configura 20 % como valor por defecto editable en admin |
| 2 | Comisión con operadores aliados | 10 % / 15 % / 20 % / por acuerdo | Campo por operador; landing `/aliados` dice "según acuerdo" |
| 3 | Unidad del add-on de Contadora (+$50) | por persona / por reserva | El add-on se crea inactivo |
| 4 | Buzón real de Atlante | concierge@atlantedelpacifico.lat / Gmail / otro | El email se quita del sitio (queda WhatsApp) hasta tenerlo |
| 5 | Dominio .com | comprar y redirigir / eliminar referencias | Se eliminan las referencias (no se compra nada sin tu ok) |
| 6 | Logo de PEX en Atlante | sí / no | Disclosure sólo con texto |
| 7 | Entidad que factura comisiones (razón social y RUC) | Tanya Engineering / SEDECO / nueva | Footer y términos sin razón social (BORRADOR) |
| 8 | Ferry Taboga hoy | activo / pausado | Se carga `available = false` hasta confirmar |
| 9 | Google Business Profile para Atlante | sí (dirección propia) / no | No se crea |
| 10 | Supabase "ATLANTE" pausado | restaurar el proyecto existente / crear uno nuevo | Bloquea R1 (los leads no se guardan) |
| 11 | Quién implementa X1–X9 en PEX | sesión de Code de PEX / Fable / otro | Atlante arranca en modo puente |
| 12 | Horario de respuesta por WhatsApp para publicarlo como hecho verificable | p. ej. "lun–dom 8:00–20:00" | No se publica ninguna promesa de tiempo de respuesta |