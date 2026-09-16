# Auditoría del MVP de charters — Atlante del Pacífico

**Fecha:** 2026-09-16  
**Auditor:** el mismo agente que construyó el MVP (revisión contra el código en `main` / `02bc0fa`).  
**Alcance:** documentación y revisión. No se agregaron features. `docs/reportes/bloque-08.md` **no existe** en este repo; los hallazgos extra usan esas mismas categorías (SEO, rendimiento, seguridad, calidad de código).

**Cómo se auditó**

- Lectura de catálogo, checkout, webhook, persistencia, marca, CSS y rutas públicas.
- `grep` de `PEX` / `Pacific Experience` / `pacificexperience` en el repo.
- HTTP contra `localhost:3000` (dev).
- Pase de navegador a **390×844** en `/charters/pacific-ferry`, `/charters/sirena-del-mar`, `/charters`, `/compare` y `/logo.png`.
- Contraste WCAG 2.1 calculado sobre los tokens de `src/app/globals.css`.

**Corrección hecha en este PR (commit aparte):** se eliminó `public/logo.png`, que servía el wordmark de Pacific Experience en una URL pública. El favicon PEX (`public/favicon.png`) **sigue** y se documenta abajo — no se inventó un isotipo de Atlante para reemplazarlo.

---

## Resumen ejecutivo

El checkout de charters **no acredita un abono solo porque llegó un webhook**: vuelve a consultar MerchantTransactions. El cliente **no puede fijar el monto**. Las 9 naves de terceros **no tienen ficha con precio**. Eso está bien hecho.

El sitio **no está listo para vender de verdad**. Los dos cobros vivos (Pacific Ferry y Sirena del Mar, 4 h) usan un sample `TODO_MARK` de **$1,300** que el propio código admite que no es tarifa 4 h confirmada — el abono cobrado sería **$390**. `/compare` y `/tours/[slug]` siguen publicando un catálogo de tours/charters con precios sin fuente. La home afirma **4.9 ★ y 127 reseñas verificadas** que no existen. El tab del navegador usa un favicon celeste de vela que no es Atlante. Sin `DATABASE_URL` el lead se va a logs y el cliente no ve un número de solicitud.

Veredicto: **infraestructura de cobro (S2S + monto en servidor) = sólida; producto comercial = no listo.**

| # | Criterio | Estado |
| --- | --- | --- |
| 1 | Datos inventados | **No cumple** |
| 2 | Seguridad del webhook de pago | **Cumple** |
| 3 | Persistencia del lead | **Parcial** |
| 4 | Marca independiente | **Parcial** |
| 5 | Monto del cobro en servidor | **Parcial** |
| 6 | Alcance (solo `/charters` vivo) | **No cumple** |
| 7 | Responsive 390 px / 44 px | **Parcial** |
| 8 | Contraste AA de marca | **Parcial** |

No se tocó el punto 2 ni el 5 en código: el webhook ya re-verifica; el monto ya se calcula en servidor. No había un agujero del tipo “`curl` el webhook y reserva gratis” que mereciera un parche de emergencia.

---

## 1. Datos inventados — **No cumple**

Criterio: cualquier precio, capacidad, marina, política o disponibilidad de las 9 naves de terceros sin fuente citada es hallazgo, aunque se vea realista. Lo mismo para prueba social y para tarifas de las naves propias si se cobran como si fueran oficiales.

### Lo que sí se hizo bien

Las 9 naves de lanzamiento de terceros están como `coming_soon`, **sin** `sampleTotalUsd`, **sin** specs, **sin** `maxPax`. `/charters/[slug]` de esas naves da **404**. `POST /api/charters/reservar` con `happy-ending` responde `unknown_charter`. Aura no está en el catálogo.

Archivo: `src/data/charters.ts` (`placeholder()`, lista a partir de Happy Ending).

### Hallazgos — naves de terceros (las 9 + extra)

| Dato | Fuente citada | Qué hay en código | Hallazgo |
| --- | --- | --- | --- |
| Precio por bloque 4/8/12 h | **NO ENCONTRADO** | `durations: []` | Correcto: no se publica tarifa. |
| Capacidad | **NO ENCONTRADO** | `maxPax: null` | Correcto en ficha; no hay ficha. |
| Marina | **NO ENCONTRADO** | `placeholder()` asigna **Marina Flamenco, Amador** a **todas** | Inventado en el modelo, aunque las cards “Próximamente” no lo imprimen. |
| ANA C | Fuera de las 11 de lanzamiento | `placeholder("ANA C", "ana-c")` | Nave extra, sin fuente. |

Naves cubiertas por `placeholder()`: Happy Ending, Sun Cat, Hatteras, Rapport, King Fish, Happiness, Yate Carver 54 Periboat, Diamond of the Sea, Endeavour, **ANA C**.

### Hallazgos — Pacific Ferry y Sirena del Mar (propias, “datos ya verificados”)

El código **no cita una fuente** (ni “PENDIENTE — sin verificar” visible al cliente). Los comentarios internos dicen `TODO_MARK`.

| Dato | En código | Fuente | Hallazgo |
| --- | --- | --- | --- |
| Nombre “Pacific Ferry” | Sin el “1” | El brief pide **Pacific Ferry 1** | Nombre incompleto en todo lo que ve el cliente. |
| Capacidad ~30 / ~80 | `maxPax` + copy “referencia” | **NO ENCONTRADO** en el repo (el brief dice que PEX las verificó; el código no lo documenta) | Se vende como ficha, con virgulilla. |
| Marina Flamenco | `DEPARTURE` compartido | **NO ENCONTRADO** como cita | Mismo string para flota propia y placeholders. |
| Rango “desde” $1,300–$1,790 / $1,300–$5,380 | `citedRangeUsd` | Comentario: “cited”, sin URL ni tarifa | Se muestra en card y ficha. |
| Total 4 h = $1,300 | `sampleTotalUsd: 1300` | El comentario dice **explícitamente** que $1,300 es el “desde”, **no** una tarifa 4 h | **Se cobra 30% = $390** sobre ese sample. Dato inventado de uso comercial, no solo de display. |
| Totales 8 h / 12 h | `null` | **NO ENCONTRADO** | No se cobra; el form igual deja enviar solicitud. |
| Incluye capitán, tripulación, combustible, chalecos | `CONSERVATIVE_INCLUDES` | Nombre de la constante = supuesto conservador | Inventario no citado; el copy dice que el operador lo confirma después. |

### Hallazgos — prueba social y otros números al cliente

| Dato | Archivo | Fuente |
| --- | --- | --- |
| 4.9 Google, 127 reseñas, +200 experiencias, 14 min de respuesta | `src/config/site.ts` (`trust`) → Hero | **NO ENCONTRADO** — números de marketing |
| “4.9 ★ · 127 reseñas verificadas” + “Recopiladas automáticamente después de cada viaje” | `src/components/sections/ReviewsSection.tsx` | Falso: no hay recolección automática |
| Mariana G., David R., Sofia & Luis (Google / TripAdvisor, fechas 2026) | `src/content/reviews.ts` | **NO ENCONTRADO** — reseñas semilla |
| Quote en Nosotros (“Nos dieron el barco correcto…”) | `src/components/sections/About.tsx` | Reciclado de la reseña inventada |
| JSON-LD `AggregateRating` 4.9 / 127 | `src/app/(site)/page.tsx` | Mismos números inventados, ahora para Google |
| Popup 10% / código `ATLANTE10` | `LeadPopups.tsx`, `/api/lead` | El endpoint **solo hace `console.log`**; no hay cupón real en el checkout de charters |
| Catálogo tours (`$850`, `$1450`, `$2800`, charters `$1200`–`$3200`, capacidades 12, itinerarios, FAQs) | `src/content/tours.ts` | **NO ENCONTRADO** — y está en rutas públicas (punto 6) |

**Razón del No cumple:** aunque las 9 naves no tienen precio en la card, el sitio cobra y publica cifras sin fuente (sample 4 h, tours, reseñas, marina en el modelo de placeholders). Un número realista sin cita cuenta igual.

---

## 2. Seguridad del webhook de pago — **Cumple**

PagueloFácil no documenta HMAC ni IPs fijas. El riesgo a auditar es: ¿se acredita el abono solo porque llegó un POST?

**No.** Return y webhook tratan `Oper` / `PARM_1` como pistas. El estado `paid` solo se escribe después de `verifyPagueloFacilTransaction` (GET MerchantTransactions con el token **crudo**, sin `Bearer`), status aprobado (incluye `1` / “Aprobada”), match de monto ±1 ¢ contra `lead.depositAmount` guardado, y `PARM_1` igual al id del lead cuando la API lo devuelve.

Archivos:

- `src/lib/paguelofacil.ts` — `verifyPagueloFacilTransaction`, `isApprovedStatus`, `amountsMatch`
- `src/app/api/payments/paguelofacil/webhook/route.ts`
- `src/app/api/payments/paguelofacil/return/route.ts`
- `src/lib/charter-requests.ts` — `markCharterDepositPaid` (idempotente si ya `paid`)

Un `curl` al webhook **sin** una transacción real aprobada en la cuenta del merchant no debería marcar pagado: `verifyPagueloFacilTransaction` falla (`s2s_empty` / `not_approved` / `bad_oper`) y el handler responde `{ received: true }` **sin** mutar.

No se parcheó nada aquí. No era el agujero de “reservar gratis”.

### Riesgos residuales (no bajan el criterio a Parcial)

| Riesgo | Archivo | Notas |
| --- | --- | --- |
| ACK 200 siempre, incluso si S2S falla | `webhook/route.ts` | Evita retry-storm; si S2S está caído y el return no corre, el dinero puede entrar en PF y el lead seguir `unpaid`. No hay cron de conciliación (el README lo deja en TODO). |
| `PARM_1` de S2S es opcional | `if (verified.parm1 && verified.parm1 !== lead.id)` | Si MerchantTransactions **no** devuelve `PARM_1`, queda el match de monto. Un `Oper` real de **otro** lead con el **mismo** depósito ($390) podría, en teoría, marcar este. Mitigación: el lookup inicial es por `parm1` del body; el atacante necesita un `Oper` aprobado de **esta** cuenta. No es “curl vacío = gratis”. |
| Sin `DATABASE_URL` no hay lead que marcar | `charter-requests.ts` | El link PF **no** se crea si `!lead.persisted`. Correcto. |
| Sin rate limit | `reservar` + webhook | Spam de leads o de llamadas S2S. |

---

## 3. Persistencia del lead — **Parcial**

Flujo real: `POST /api/charters/reservar` llama **primero** a `createCharterLead` y **después** (si hay DB + PF + monto ≥ $1) a LinkDeamon.

Si el usuario envía el form y el pago falla, o cierra la pestaña **después** del POST: el lead **sí** existe **si** `DATABASE_URL` está y `charterRequest.create` no falló. Si PagueloFácil rechaza el link, igual se responde `ok: true` con `pago=pendiente`. Eso está bien.

Lo que **no** cumple el criterio de “número de solicitud que el cliente pueda usar para que lo rescaten por WhatsApp”:

| Situación | Qué pasa | Archivo |
| --- | --- | --- |
| Preview / prod **sin** Postgres | Lead solo en `console.log` (`persisted: false`). El JSON trae `id`/`token` que **no** se pueden buscar. `/gracias` no recupera el lead. | `src/lib/charter-requests.ts` |
| Persist falla (excepción Prisma) | Se traga el error, `persisted: false`, UX de éxito | mismo |
| `/gracias` | No imprime el UUID ni un código corto. El WhatsApp prellenado **no** lleva el id. | `src/app/(site)/reservar/[slug]/gracias/page.tsx` |
| Cierra en el hosted checkout de PF (antes de volver) | Lead en DB (si hubo persist) en `unpaid`, pero el cliente **nunca vio** un número | — |
| Cierra **antes** de submit | No hay lead (esperado) | — |

Verificado en local sin DB: `POST` 4 h → `ok: true`, `depositAmount: 390`, `checkoutUrl: null`, `id` tipo UUID. Ese id no aparece en la página de gracias.

**Razón del Parcial:** el diseño guarda *antes* de cobrar (bien), pero el rescate por WhatsApp depende de que ops busque por teléfono en una tabla que el admin **ni siquiera lista** (el dashboard lee `Booking`, no `CharterRequest`).

---

## 4. Marca — **Parcial**

### Grep de texto en lo que renderiza al cliente

Cadenas `PEX`, `Pacific Experience`, `pacificexperience` en `src/app`, `src/components`, `src/content`, `src/data`, `src/config`, `src/lib/i18n.ts`: **0 hits**.

Hits **solo** en:

- comentarios de `src/lib/paguelofacil.ts` (`server-only`, no se envían al browser)
- `README.md` y `.env.example` (no son el sitio)

HTML de `/` y `/charters/pacific-ferry` en local: **sin** esas cadenas.

Las fichas de Pacific Ferry / Sirena **no** dicen “operado por PEX”.

### Lo que el grep de texto no ve (y el cliente sí)

| Asset / superficie | Qué es | ¿Lo ve el cliente? |
| --- | --- | --- |
| `public/logo.png` | Wordmark **“The PACIFIC EXPERIENCE”** + ola celeste | Sí, en `https://…/logo.png` (HTTP 200). **No** está en el header. **Eliminado en este PR.** |
| `public/favicon.png` | Vela **azul/celeste**, no verde/dorado Atlante | Sí: `layout.tsx` → `icons: { icon: "/favicon.png" }` (pestaña del browser). **Sigue.** |
| Checkout hosted de PagueloFácil | Fuera de este repo | **PENDIENTE MARK:** si las credenciales son las de PEX, la pasarela puede mostrar el nombre comercial de PEX. No se pudo probar aquí (sin `PAGUELOFACIL_*`). |
| Identidad en página | Verde `#0a2421` / oro `#d7a85b` / bronce `#b8733a` / marfil | No es el celeste de PEX. Header es “A” + “Atlante”. OG `og-atlante.jpg` es Atlante. |

**Razón del Parcial:** copy independiente = cumple; assets heredados de PEX = no.

---

## 5. Monto del cobro — **Parcial**

### ¿Se puede manipular desde el cliente?

**No.** El body de `reservar` manda `slug`, `durationId`, `date`, `guests`, `name`, `whatsapp`. **No** hay campo de monto. `createCharterLead` toma `duration.sampleTotalUsd` del catálogo y `depositFromSample` (30%).

Prueba local: `depositAmount: 1` en el JSON **no** cambia el cobro; la respuesta sigue `depositAmount: 390` para 4 h de Pacific Ferry.

Archivos: `src/app/api/charters/reservar/route.ts`, `src/lib/charter-requests.ts`, `src/data/charters.ts`.

### ¿Nave sin bloques de precio?

| Caso | Comportamiento |
| --- | --- |
| 9 naves `coming_soon` | `unknown_charter` (400). No hay cobro inventado. |
| 8 h / 12 h de las dos naves live (`sampleTotalUsd: null`) | Lead con `depositAmount: 0`. **No** se crea link PF (`depositAmount < 1`). Botón “Enviar solicitud”. No es un monto inventado; es solicitud sin cobro. |
| 4 h live | Cobra **$390** = 30% de **$1,300 sample TODO_MARK**. Eso **sí** es un monto de catálogo no verificado como tarifa 4 h. |

**Razón del Parcial:** anti-manipulación = cumple; el único path que cobra usa un sample que el código declara no oficial.

No se cambió el cálculo: dejar de cobrar $390 sin tarifa de Mark sería un cambio de producto, no un parche de seguridad de “el cliente pone el precio”.

---

## 6. Alcance (`/tours` y `/compare`) — **No cumple**

Criterio: Ferry y Tours “Próximamente”, o **sin** catálogo de precios sin verificar al público. Solo `/charters` vivo.

| Ruta | HTTP local | Qué muestra |
| --- | --- | --- |
| `/` Hero Ferry / Tours | 200 | “Próximamente” (bien) |
| `/charters` | 200 | Catálogo MVP (bien) |
| `/tours` (índice) | **404** | No hay `page.tsx` |
| `/tours/travesia-al-atardecer` | **200** | Precio `$850` + calculadora de depósito |
| `/tours/charter-atardecer-privado` | **200** | Precio `$1200` per boat, etc. |
| `/compare` | **200** | Tabla “Precio desde” de **todo** `src/content/tours.ts` (p. ej. $850, $1,450) |
| `robots.ts` | allow `/` | Esas URLs son indexables |
| `sitemap.ts` | solo `/` y `/charters*` | El sitemap no las anuncia; Google igual puede hallarlas |

`ToursSection` (con link a `/compare` y cards con precio) **ya no** está en la home, pero las rutas hijas siguen vivas. `PriceCalculator` dice “Reserva ahora, paga el resto después” sobre precios inventados y puede `POST /api/bookings`.

**Razón del No cumple:** precios sin verificar **sí** están expuestos al público.

---

## 7. Responsive 390 px — **Parcial**

Pase de navegador **390×844** (iPhone 12/13) en las fichas live.

| Check | Pacific Ferry | Sirena del Mar |
| --- | --- | --- |
| `scrollWidth` vs `clientWidth` | 390 = 390, **sin** scroll horizontal | Misma plantilla, sin overflow |
| CTA principal “Pagar abono 30%” | altura **46 px** (≥ 44) | 46 px |
| Disclaimer 24 h visible **antes** de submit | Sí (`DepositDisclaimer`) | Sí |
| Form (nombre, WhatsApp, fecha, horas, pax) | Usable | Usable |
| Panel de reserva | Apila debajo (`tour-layout` → 1 columna &lt; 980 px), no se sale | Igual |
| Header Atlante + menú + ES/EN + “Ver charters” | Cabe, sin wrap destructivo | Igual |
| Galería | Tres veces el mismo `og-atlante.jpg` (logo, no la nave) | Igual |

CSS que **no** llega a 44 px (no medido en DevTools en todos; está en hoja):

- `.card-link` (“Ver y reservar”): 12 px, **sin** `min-height` — `/charters`
- `.nav-cta` ≤900 px: `min-height: 42px`
- `.lang-toggle button`: padding 6×10
- `.nav-toggle`: 42×42

Inputs: padding 14 px + font 16 px ≈ 44 px.

**Razón del Parcial:** fichas live no hacen scroll horizontal y el botón de pago cumple 44 px; el resto de taps de flota/header no.

---

## 8. Accesibilidad (contraste AA) — **Parcial**

**No se ajustó ningún token de marca en este PR.** Subir contraste de oro/bronce sería un **cambio de marca**, no un tweak silencioso. Mark tiene que decidir si se oscurece el oro o se deja de usar oro/bronce como texto pequeño sobre marfil.

Tokens: `--ink #0a2421`, `--deep #123b36`, `--ivory #f8f3e8`, `--bronze #b8733a`, `--gold #d7a85b`.

| Par | Ratio | AA texto normal (4.5:1) | AA grande / UI (3:1) | Dónde se usa |
| --- | --- | --- | --- | --- |
| Ink sobre ivory | 14.74 | Pasa | Pasa | Cuerpo |
| Ivory sobre ink | 14.74 | Pasa | Pasa | Hero, secciones oscuras |
| Oro sobre ink (eyebrow del hero) | 7.49 | Pasa | Pasa | Hero |
| Ink sobre oro (lang activo) | 7.49 | Pasa | Pasa | Toggle |
| **Oro sobre ivory** | **1.97** | **Falla** | **Falla** | `.card-link` default, badges |
| **Bronce sobre ivory** (12 px uppercase) | **3.42** | **Falla** | Pasa grande | `.eyebrow`, `.fact`, `.spec-grid dt`, links de card `light-card` |
| Ivory sobre bronce (CTA primario, 12 px) | 3.42 | **Falla** texto | Pasa como componente UI ≥3:1 | `.button-primary` |
| Bronce sobre ink | 4.31 | Falla por poco | Pasa | Eyebrows en sección oscura |
| `rgba(ink,.55)` sobre ivory (~`#75817b`) | 3.66 | Falla a 12 px | Pasa grande | Helper del form, `price-table th` |

El CTA de cobro **no** pasa AA como texto de 12 px; sí pasa el umbral de componente. Los labels bronce/oro de 11–12 px sobre marfil son el fallo más visible en las fichas.

Otros a11y (fuera del criterio de color, misma ficha): galería con `<img>` repetida y alt genérico; `next/font` no carga Inter (el CSS lo nombra; el layout no lo importa) — fallback del sistema.

---

## Hallazgos adicionales (estilo bloque-08)

### SEO

| Severidad | Hallazgo | Archivo |
| --- | --- | --- |
| Alta | JSON-LD `AggregateRating` 4.9 / 127 **inventado**. Política de rich results de Google: reseñas debe ser reales. Riesgo de rechazo o peor. | `src/app/(site)/page.tsx`, `src/content/reviews.ts` |
| Alta | `/tours/*` y `/compare` indexables (`robots` allow all) con ofertas schema.org (`InStock` + precio) **sin verificar**. | `src/app/robots.ts`, `src/app/(site)/tours/[slug]/page.tsx` |
| Media | `canonical` del root en `layout.tsx` apunta siempre a `site.url`; las fichas sí tienen canonical propio. | `src/app/layout.tsx` |
| Media | Título/descripción aún hablan de “tours curados” en un sitio que dice que Tours no está a la venta. | `src/config/site.ts`, metadata |
| Baja | `sitemap.ts` omite `/compare` y `/tours/*` (coherente con el pivot; contradice que esas rutas existan). | `src/app/sitemap.ts` |
| Baja | Un solo `og-atlante.jpg` (marca, no nave) para Open Graph de todas las fichas. | `public/og-atlante.jpg` |

### Rendimiento

| Severidad | Hallazgo | Archivo |
| --- | --- | --- |
| Media | Hero, cards y galería son `background-image` / `<img>`, no `next/image`. Sin `sizes`, sin srcset, LCP = JPG de marca ~397 KB repetido 3 veces en galería. | `CharterFicha.tsx`, `globals.css` |
| Media | Inter declarado en CSS, **nunca** cargado con `next/font`. | `src/app/layout.tsx`, `globals.css` |
| Baja | Leaflet entra en el bundle de fichas de **tours** (no de `/charters/[slug]`). Costo muerto mientras esas rutas existan. | `TourDetail.tsx` |
| Baja | `LeadPopups` + `Analytics` en el layout de todo el sitio. Analytics inerte sin env; el popup igual corre timer de 18 s. | `(site)/layout.tsx` |

### Seguridad

| Severidad | Hallazgo | Archivo |
| --- | --- | --- |
| Crítica (dependencia) | `next@16.2.10` en `npm audit`: **critical** (varios GHSA: proxy bypass Turbopack, DoS Server Actions, RCE en Windows / Image Optimization AVIF, etc.). Varios pueden no aplicar al hosting en Vercel/Linux; **igual hay que subir Next** en un PR aparte, no en este. | `package.json` |
| Alta (ops) | Admin HMAC + password compartido. `AUTH_SECRET` **no** está en `.env.example`. Cookie `admin_session` 7 días. | `src/lib/auth.ts` |
| Media | `/api/charters/reservar` y `/api/lead` sin rate limit. Lead de email no se guarda. | `reservar/route.ts`, `lead/route.ts` |
| Media | `console.log("[charter-lead]", { name, whatsapp, ... })` — PII en logs de Vercel. | `charter-requests.ts` |
| Media | `/api/bookings` sigue abierto: crea `Booking` con precios del catálogo inventado si hay DB. | `src/app/api/bookings/route.ts` |
| Baja | `checkPassword` sale pronto si las longitudes difieren (timing menor). | `auth.ts` |
| Info | Prisma `db` se instancia al importar; rutas admin asumen `DATABASE_URL`. | `src/lib/db.ts` |

**Punto 2 (webhook) no se duplica aquí:** ya está en Cumple.

### Calidad de código

| Severidad | Hallazgo | Archivo |
| --- | --- | --- |
| Alta | Dos catálogos: `src/data/charters.ts` (MVP) vs `src/content/tours.ts` (Phase 1). El admin, seed y `/api/bookings` viven en el segundo. Un cobro real de charter **no aparece** en `/admin`. | `src/app/admin/(dash)/*`, `prisma/seed.ts` |
| Media | `pricesAreSample: true` hardcodeado en el tipo `CharterDuration` — no hay camino de tipos para “ya verificado”. | `src/data/charters.ts` |
| Media | Seed abre 60 días de cupos y cupón `WELCOME10` para slugs de tours que no deberían venderse. | `prisma/seed.ts` |
| Media | Copy “Ver y reservar” / H1 “Reservar {nave}” vs modelo de **solicitud**. | `CharterCard.tsx`, `reservar/[slug]/page.tsx` |
| Baja | FX estático EUR/COP/MXN; PF cobra USD. El form muestra el abono convertido. | `src/lib/format.ts` |
| Baja | Leftovers `create-next-app`: `public/vercel.svg`, `globe.svg`, etc. | `public/` |
| Baja | Prisma avisa deprecation `package.json#prisma` de cara a v7. | `package.json` |

---

## Evidencia rápida (comandos)

```
GET /charters/pacific-ferry        200
GET /charters/sirena-del-mar       200
GET /charters/happy-ending         404
GET /charters/aura                 404
GET /compare                       200
GET /tours                         404
GET /tours/travesia-al-atardecer   200
POST /api/charters/reservar 4h     depositAmount=390 (ignora monto del cliente)
POST ... 8h                        depositAmount=0, sin checkoutUrl
POST ... slug=happy-ending         400 unknown_charter
```

---

## Qué no se verificó (límites de este entorno)

- Credenciales reales de PagueloFácil (sandbox o prod): **NO ENCONTRADO** en el entorno del agente.
- Que `DATABASE_URL` de producción esté puesta y `prisma db push` aplicado.
- Qué nombre comercial muestra el hosted checkout de PF.
- Buzón real de `concierge@atlantedelpacifico.com` vs dominio del sitio `.lat`.
- Instagram / ficha de Google Business reales.
- Contraste con un auditor axe en CI (solo cálculo de ratio + inspección visual).
