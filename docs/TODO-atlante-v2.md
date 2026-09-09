# TODO — Atlante del Pacífico v2 (broker PEX + charters)

Fecha: 2026-09-09 · Orden = prioridad de ejecución · Esfuerzo estimado para una sesión de código (Claude Code) salvo donde dice Mark / PEX / comercial. Acompaña al `02-PRD-atlante-v2.md`.

Leyenda de "Dónde": Atlante = repo `mharr92-hub/atlante` · PEX = repo de Pacific Experience (otra sesión) · Mark = decisión o cuenta que sólo él puede tocar · Infra = Vercel / Supabase.

| ID | Tarea | Prio | Release | Dónde | Archivos / notas | Esfuerzo | Depende de |
|---|---|---|---|---|---|---|---|
| T01 | Crear rama `feature/atlante-broker` desde `origin/main` (escritor único; sin merge ni deploy sin ok de Mark) | P0 | R0 | Atlante | git | 5 min | — |
| T02 | Dominio y contacto reales: `site.url`/`domain` → `https://www.atlantedelpacifico.lat`; borrar `trust`; email fuera del sitio hasta tener buzón real | P0 | R0 | Atlante | `src/config/site.ts`, `Hero.tsx`, `Footer.tsx`, `ContactSection.tsx`, `layout.tsx` | 1 h | — |
| T03 | Eliminar reseñas inventadas y el `aggregateRating` del JSON-LD del home | P0 | R0 | Atlante | borrar `src/content/reviews.ts`, `ReviewsSection.tsx`; `app/(site)/page.tsx` | 1 h | — |
| T04 | Quitar la urgencia falsa ("Pocos cupos esta semana") | P0 | R0 | Atlante | `TourCard.tsx` (prop `urgency`), `ToursSection.tsx`, `i18n.ts` (`spots_left`), `globals.css` | 30 min | — |
| T05 | Apagar el popup "10 % en tu primera reserva" y el código ATLANTE10; `/api/lead` pasa a guardar `Subscriber` o se elimina | P0 | R0 | Atlante | `LeadPopups.tsx`, `app/api/lead/route.ts`, `i18n.ts` (`popup_*`) | 1 h | — |
| T06 | Sólo USD: quitar selector de moneda y tasas fijas | P0 | R0 | Atlante | `lib/format.ts`, `lib/currency-context.tsx`, `Header.tsx`, `Providers.tsx` | 1 h | — |
| T07 | Eliminar la palabra "Sunset" de todo texto público (ES/EN) | P0 | R0 | Atlante | `i18n.ts` (`filter_sunset`, `tours_title`), `app/layout.tsx` (keywords), `Destinations.tsx`; `tours.ts` se borra en T21 | 30 min | — |
| T08 | Componente único `PexDisclosure` ("Agente autorizado de Pacific Experience…") en home, catálogo, paso 3, redirección y footer | P0 | R0 | Atlante | `components/site/PexDisclosure.tsx` | 1 h | — |
| T09 | Páginas legales en BORRADOR: `/terminos`, `/privacidad`, `/cancelaciones`, `/como-funciona` + enlaces en footer | P0 | R0 | Atlante | `app/(site)/legal/*` | 3 h | — |
| T10 | Redirecciones 301: `/compare` → `/charters/comparar`; `/tours/charter-*`, `/tours/yate-*` → `/charters`; tours inventados → `/tours` | P0 | R0 | Atlante | `next.config.ts` | 30 min | — |
| T11 | Crear `.env.example` con todas las variables (DATABASE_URL, DIRECT_URL, ADMIN_PASSWORD, AUTH_SECRET, NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_PEX_BASE_URL, PEX_HANDOFF_SECRET, PEX_WEBHOOK_SECRET, CRON_SECRET) | P0 | R0 | Atlante | `.env.example`, README | 30 min | — |
| T12 | Quitar el JSON-LD `Offer` con precio inventado de las fichas hasta que exista catálogo real | P0 | R0 | Atlante | `app/(site)/tours/[slug]/page.tsx` | 30 min | — |
| T13 | Deploy de R0: build limpio, push, preview, aprobación, merge, verificación en 3 niveles, alta en Search Console del .lat y re-rastreo | P0 | R0 | Mark + Atlante | Vercel | 1 h | T02–T12 |
| T14 | Restaurar el proyecto Supabase "ATLANTE" (`odeivsrdtgernzndwnmm`, hoy INACTIVE) o crear uno nuevo | P0 | Infra | Mark | Decisión #10 | 15 min | — |
| T15 | Configurar en Vercel: `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432), `ADMIN_PASSWORD`, `AUTH_SECRET` | P0 | Infra | Mark | Antes del push de R1 (las `NEXT_PUBLIC_` se hornean en build) | 15 min | T14 |
| T16 | Decidir buzón real y dominio .com (comprar + 301, o eliminar referencias) | P0 | Infra | Mark | Decisiones #4 y #5 | — | — |
| T17 | Crear propiedad GA4 y Meta Pixel; cargar `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_META_PIXEL_ID` en Vercel | P0 | Infra | Mark | Activa `Analytics.tsx` | 30 min | — |
| T18 | Prisma: `Product`, `ProductAddon`, `Operator`, `Vessel`, `PartnerApplication`, `Handoff`, `PexEvent`; rediseñar `Lead` (el actual pasa a `Subscriber`); migración `broker_v2` | P0 | R1 | Atlante | `prisma/schema.prisma`, `prisma/migrations/*` | 4 h | T14, T15 |
| T19 | Seed del catálogo PEX con `verifiedAt = 2026-09-09` y `sourceUrl`: Ferry Taboga (estado PENDIENTE), Tour por la Bahía $25, Party en la Bahía desde $35, Contadora `available=false` + add-on inactivo; operador `pex` | P0 | R1 | Atlante | `prisma/seed.ts` (idempotente) | 2 h | T18 |
| T20 | `src/lib/pex.ts` con `buildPexUrl()` + test unitario "toda URL lleva `ref=ATLANTE`" + script `npm run check:pex-links` | P0 | R1 | Atlante | `lib/pex.ts`, `tests/pex.test.ts`, `scripts/check-pex-links.ts` | 3 h | — |
| T21 | `/tours` (catálogo) y `/tours/[slug]` (ficha) desde la base de datos; borrar `content/tours.ts` y el comparador viejo | P0 | R1 | Atlante | `app/(site)/tours/*`, `components/tour/*` | 1 día | T18, T19 |
| T22 | Funnel `/reservar/[slug]` en 3 pasos: estado en URL, calendario por `schedule`, categorías de pasajero, adicionales, resumen, checkbox de políticas | P0 | R1 | Atlante | `app/(site)/reservar/[slug]/*`, `components/funnel/*` | 2 días | T21 |
| T23 | `POST /api/leads` (crea `Lead` + `Handoff`, devuelve `destinationUrl`, nunca bloquea) + pantalla `/reservar/[slug]/listo` con código ATLANTE copiable y salto en 2 s | P0 | R1 | Atlante | `app/api/leads/route.ts`, `app/(site)/reservar/[slug]/listo/page.tsx` | 4 h | T20, T22 |
| T24 | `GET /api/handoff/[token]`: secreto compartido, un solo uso, TTL 30 min, sin PII en logs | P0 | R1 | Atlante | `app/api/handoff/[token]/route.ts` | 2 h | T18 |
| T25 | Admin `/admin/leads`: filtros, detalle, botón WhatsApp de rescate, "marcar pagado" con `pex_booking_id` y monto, export CSV | P0 | R1 | Atlante | `app/admin/(dash)/leads/*`, `admin/actions.ts` | 1 día | T18 |
| T26 | Admin `/admin/catalogo`: CRUD de productos y adicionales, `verificado_el` visible, aviso a los 14 días sin verificar | P0 | R1 | Atlante | `app/admin/(dash)/catalogo/*` | 1 día | T18 |
| T27 | `npm run check:pex`: compara precio y disponibilidad del catálogo contra las páginas públicas de PEX y lista diferencias (sólo reporta) | P0 | R1 | Atlante | `scripts/check-pex.ts` | 3 h | T19 |
| T28 | Analítica: helper `track()` con los eventos del PRD 5.12, GA4 `linker` hacia pacificexperience.lat, evento `Lead` de Meta en el paso 3 | P0 | R1 | Atlante | `lib/analytics.ts`, `Analytics.tsx` | 3 h | T17, T22 |
| T29 | Tarjetas simples de las naves PEX (Aura, Pacific Ferry 1, Sirena del Mar) con deep-link `charter_checkout` para no perder atribución antes de R2 | P0 | R1 | Atlante | `components/sections/ChartersSection.tsx` | 2 h | T20 |
| T30 | Retirar del flujo público `/api/bookings`, `PriceCalculator`, el seed antiguo y `AvailabilitySlot` | P0 | R1 | Atlante | `app/api/bookings/route.ts`, `components/tour/PriceCalculator.tsx`, `prisma/seed.ts` | 2 h | T22 |
| T31 | QA de R1 (criterios A1–A6, A8–A10, A12), capturas móvil 390 px y desktop, build, push de la rama (sin merge) | P0 | R1 | Atlante | Reporte con SHA | 4 h | T18–T30 |
| T32 | X1 — Leer `ref`/`ref_id` por URL en checkouts de tours, charter y ferry; prellenar `referral_code`; guardar `ref`, `ref_id`, `utm_*` en la orden; cookie 30 días | P0 | R1b | PEX | Anexo PRD §7 | 1 día | — |
| T33 | X2 — Aceptar `tickets` (y categorías) por URL en el checkout de tours | P0 | R1b | PEX | §7 | 2 h | T32 |
| T34 | X3 — Prellenado por token `h` consultando `GET atlante/api/handoff/<h>` | P0 | R1b | PEX | §7 | 4 h | T24 |
| T35 | X4 — Feed público `GET /api/public/trips` y `GET /api/public/slots` (cache 60 s, sin PII) | P0 | R1b | PEX | §7 | 1 día | — |
| T36 | X5 — Webhook firmado `booking.paid` / `cancelled` / `refunded` hacia Atlante cuando `referral_code = ATLANTE` | P0 | R1b | PEX | §7 | 4 h | T44 |
| T37 | X6 — `purchase` cross-domain en la página de éxito (aceptar `_gl`) | P1 | R1b | PEX | §7 | 2 h | T28 |
| T38 | X7 — Add-on "Tour por las islas — 4 h — +$50" en el ferry de Contadora, premarcado por `addon=` | P1 | R1b | PEX | Cuando Contadora se active; unidad = decisión #3 | 2 h | — |
| T39 | X8 — Calendario en `/ferry/bahia` en lugar de las píldoras de fechas | P1 | R1b | PEX | Mejora propia de PEX | 4 h | — |
| T40 | X9 — Registrar `BROKER = ATLANTE` en la hoja de disponibilidad de charters para reservas con `ref=ATLANTE` | P1 | R1b | PEX / ops | Google Sheets de charters | 30 min | — |
| T41 | `ProductSlot` + `GET /api/cron/sync-pex` (Vercel Cron cada 15 min, `CRON_SECRET`, fallback al último snapshot) | P0 | R1c | Atlante | `app/api/cron/sync-pex/route.ts`, `vercel.json` | 1 día | T35 |
| T42 | Paso 2 con fechas y cupos reales: sólo días con salida, abre en la próxima salida, valida cupo, ofrece 3 próximas fechas | P0 | R1c | Atlante | `components/funnel/DatePicker.tsx` | 1 día | T41 |
| T43 | `buildPexUrl` target `tour_checkout` con `slot_id`, `tickets`, `h` (deep-link directo al checkout) | P0 | R1c | Atlante | `lib/pex.ts` | 2 h | T32–T34 |
| T44 | `POST /api/pex/booking-confirmed`: firma HMAC + timestamp, idempotencia por `pex_booking_id`, estados `paid` / `paid_unmatched`, reversión por cancelación | P0 | R1c | Atlante | `app/api/pex/booking-confirmed/route.ts` | 4 h | T18 |
| T45 | Admin `/admin/comisiones`: mes, operador, reservas, monto, %, comisión; export CSV para Sheets | P0 | R1c | Atlante | `app/admin/(dash)/comisiones/*` | 4 h | T44 |
| T46 | Regla automática `lost` a los 7 días sin pago + aviso al concierge (email/WhatsApp) por cada lead nuevo | P1 | R1c | Atlante | Cron + `lib/notify.ts` | 3 h | T25 |
| T47 | Fichas `Vessel` de Aura, Pacific Ferry 1 y Sirena del Mar con datos de PEX (precios de PF1 y Sirena: NO ENCONTRADOS el 09/09 → revisar `/charter/pacific-ferry-1` y `/charter/sirena-del-mar`) | P1 | R2 | Atlante | `prisma/seed.ts` | 4 h | T18 |
| T48 | `/charters` listado con filtros (capacidad, presupuesto, duración, ruta, tipo, marina) y precio por persona calculado | P1 | R2 | Atlante | `app/(site)/charters/page.tsx` | 1 día | T47 |
| T49 | `/charters/[slug]` ficha estándar + badge "Reserva directa" (PEX, deep-link con `ref`) vs "Cotizar" (aliado) | P1 | R2 | Atlante | `app/(site)/charters/[slug]/page.tsx` | 1 día | T47 |
| T50 | `/charters/comparar` (hasta 4 naves; precio por hora y por persona; incluye / no incluye) | P1 | R2 | Atlante | `components/charters/Compare.tsx` | 4 h | T48 |
| T51 | `/cotizar/[slug]`: lead `charter_partner` (fecha, horas, pax, ocasión, datos) → WhatsApp del concierge; estados `quote_requested` → `paid` en admin | P1 | R2 | Atlante | `app/(site)/cotizar/[slug]/*`, `admin/leads` | 1 día | T25 |
| T52 | `/aliados` + `/aliados/registro` → `PartnerApplication` + `/admin/aliados` | P1 | R2 | Atlante | `app/(site)/aliados/*`, `app/admin/(dash)/aliados/*` | 1 día | T18 |
| T53 | Admin `/admin/naves` y `/admin/operadores`: CRUD, `comision_pct`, contrato, checklist "verificado" (AMP, seguro) | P1 | R2 | Atlante | `app/admin/(dash)/naves/*`, `operadores/*` | 1 día | T18 |
| T54 | Códigos de aliado: `?partner=CODE` → cookie 30 días → `Lead.partnerCode`; reparto en `/admin/comisiones`; reutiliza `Reseller` | P1 | R3 | Atlante | `middleware.ts`, `lib/partner.ts` | 4 h | T45 |
| T55 | Contrato de comisión tipo para operadores + kit de operador (ficha estándar, fotos mínimas, políticas) | P1 | R3 | Mark / legal | Sin plantilla en el repo | 1 día | Decisión #2 |
| T56 | Prospección: 5 primeros operadores reales, hoteles y concierges con código, reutilizar los ~62 prospectos B2B de PEX desde la marca Atlante | P1 | R3 | Comercial | CRM / Sheets | Continuo | T52, T54 |
| T57 | Páginas `/destinos/taboga`, `/destinos/las-perlas`, `/destinos/bahia` con "todas las formas de ir" | P2 | R4 | Atlante | `app/(site)/destinos/[slug]/page.tsx` | 1 día | T21, T48 |
| T58 | EN completo + `hreflang` + rutas `/en/*` | P2 | R4 | Atlante | `i18n.ts`, `middleware.ts`, metadata | 2 días | T57 |
| T59 | Guías comparativas (2 al mes): ferry vs charter a Taboga, cuánto cuesta un yate por persona, mejor mes para Las Perlas | P2 | R4 | Atlante / contenido | `app/(site)/blog/*` | Continuo | T57 |
| T60 | Ads: reparto de palabras clave (Atlante = comparación/charter; PEX = marca/producto); remarketing Meta a `redirect_to_pex` sin `purchase` | P2 | R4 | Mark / ads | Google Ads + Meta | Continuo | T28, T37 |
| T61 | Google Business Profile para Atlante sólo si tiene dirección/entidad distinta de PEX | P2 | R4 | Mark | Decisión #9 | — | Decisión #7 |
| T62 | CI: Lighthouse móvil ≥ 85 y Playwright e2e del funnel en cada preview | P2 | R4 | Atlante | `.github/workflows/ci.yml` | 1 día | T31 |

Resumen de esfuerzo (sesión de código, Atlante): R0 ≈ 1–2 días · R1 ≈ 6–8 días · R1c ≈ 3–4 días · R2 ≈ 5–6 días · R3 ≈ 1 día · R4 ≈ 5+ días. PEX (R1b) ≈ 3–4 días en la sesión de PEX.