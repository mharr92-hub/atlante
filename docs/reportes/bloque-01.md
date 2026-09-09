# Bloque 1 — R0 · Limpieza y verdad

Fecha: 2026-09-08 · Rama: `feature/atlante-broker` · Sin push, sin merge, sin deploy, sin tocar Vercel ni Supabase.

Commits del bloque (sobre `8c3def0`):

| SHA | Sub-bloque |
|---|---|
| `1a19f9b` | Solo USD, sin urgencia falsa, sin métricas de confianza y sin la palabra "Sunset" |
| `c258f38` | Disclosure de agente autorizado, páginas BORRADOR y precios inventados fuera de la vista |
| `b85feca` | Redirecciones 301, `.env.example`, sitemap/robots y noindex del admin |
| (este) | README y reporte del bloque |

Estado al empezar: los puntos 1 y 2 del bloque (dominio `.lat`, contacto, `trust`, `social`, `navItems` y `src/lib/pex.ts`) ya venían hechos en el commit `961d381`, igual que el borrado de `reviews.ts`, `ReviewsSection.tsx`, `LeadPopups.tsx`, `/api/lead` y el bloque `.quote` de `About.tsx`. **El repo no compilaba**: `src/app/(site)/page.tsx` seguía renderizando `<ReviewsSection />` sin importarlo. Ese era el primer arreglo.

## Qué se hizo, por archivo

### Verdad en la vista

- **`src/app/(site)/page.tsx`** — se quita el `<ReviewsSection />` huérfano (build roto) y se inserta `<PexDisclosure variant="banner" />` justo debajo del hero. El JSON-LD del home ya era `TravelAgency` con `name`, `url`, `telephone` y `address`, sin `email` ni `aggregateRating`: se deja igual.
- **`src/components/sections/Hero.tsx`** — fuera la `.trust-row` (4.9 Google / 127 reseñas / +200 experiencias / 14 min, todo inventado). Nuevo `hero_lede` de broker y dos botones: "Tickets y tours" → `/tours` y "Charters" → `/charters`. Se cae el botón de WhatsApp del hero; el WhatsApp flotante sigue en toda página.
- **`src/components/tour/TourCard.tsx`** — fuera la prop `urgency` y la píldora "Pocos cupos esta semana"; fuera el precio. La tarjeta deja duración, badges, resumen y los dos enlaces.
- **`src/components/sections/ToursSection.tsx`** — deja de pasar `urgency`, deja de enlazar a `/compare` y usa la categoría `evening`.
- **`src/components/tour/TourDetail.tsx`** — `PriceCalculator` se reemplaza por un `ConsultPanel` local: duración, una línea explicando que la disponibilidad y el precio los confirma el operador, el CTA "Consultar por WhatsApp" y el disclosure `inline`. Sin precio, sin depósito, sin formulario.
- **`src/app/(site)/tours/[slug]/page.tsx`** — fuera `offers` del JSON-LD `TouristTrip` (precio inventado). El resto del `TouristTrip` se queda.
- **`src/lib/i18n.ts`** — se borran `spots_left`, `booked_today`, `popup_*` y `trust_*`. Se agregan `hero_cta_charters`, `consult_whatsapp`, `draft_notice` y las cuatro etiquetas legales del footer.

### Sólo USD

- **`src/lib/format.ts`** — `money(usd)` queda sólo en USD (`en-US`, `USD`, 0 decimales si es entero, 2 si tiene centavos). Fuera `CurrencyCode` y las tasas fijas EUR 0.92 / COP 4050 / MXN 17.1. `priceForGuests()` y `depositAmount()` se conservan porque `lib/bookings.ts` los usa.
- **Borrado `src/lib/currency-context.tsx`**; `Providers.tsx` y `Header.tsx` (selector `<select className="currency-select">`) actualizados; CSS `.currency-select` eliminado.

### "Sunset" = 0

`grep -rni sunset src/` → **0 resultados**, incluidos identificadores internos:

- `src/lib/i18n.ts`: `tours_title.en` → "Evening, island, archipelago."; la clave `filter_sunset` se renombra a **`filter_evening`** con `en: "Evening"` (el nombre de la clave también contenía la palabra).
- `src/app/layout.tsx`: keyword → "evening cruise Panama City".
- `src/components/sections/Destinations.tsx`: EN → "Bay of Panama at dusk".
- `src/content/tours.ts`: "Sunset Voyage" → "Evening Voyage"; "Private Sunset Charter" → "Private Evening Charter"; "Sunset and return" → "Dusk and return"; "Return to Amador at sunset." → "at dusk."; "The sun sets behind the canal" → "The sun drops behind the canal". Categoría interna `"sunset"` → `"evening"` y `cardCrop` `"card-sunset"` → `"card-evening"`.
- `src/app/globals.css`: `.card-sunset` → `.card-evening`.

### Disclosure PEX

- **`src/components/site/PexDisclosure.tsx`** (nuevo, client, bilingüe) con variantes `banner` (bloque destacado con fondo marfil) e `inline` (una línea, con `tone` claro u oscuro según la superficie). El enlace usa `buildPexUrl({ target: "home", campaign: "disclosure" })`. Sin logo de PEX.
- Se usa como `banner` en el home (bajo el hero), en `/tours` y en `/charters`; como `inline` en el Footer y en el panel de la ficha de producto.
- El dominio de PEX se lee de `PEX_DOMAIN_LABEL` / `PEX_BRAND` (`src/lib/pex.ts`). En todo `src/` no hay ni un literal `pacificexperience.lat` fuera de ese archivo.

### Páginas nuevas

- **`/tours`** y **`/charters`** (`src/app/(site)/tours/page.tsx`, `charters/page.tsx`): placeholders con metadata propia que renderizan `ToursSection` / `ChartersSection` más el disclosure. El bloque 2 las reemplaza.
- **`/terminos`, `/privacidad`, `/cancelaciones`, `/como-funciona`**: server components con `metadata`, contenido bilingüe en un objeto `{ es, en }` local y el locale leído de la cookie, igual que `tours/[slug]/page.tsx`. Cada una abre con la franja **"BORRADOR — pendiente de revisión por Mark"**.
- **`src/components/site/LegalShell.tsx`** (nuevo): la envoltura común de esas cuatro páginas (franja BORRADOR + título + cuerpo), para no repetirla cuatro veces.
- **`src/components/site/Footer.tsx`**: segunda columna de navegación con las cuatro páginas y el disclosure `inline`.

Contenido de las legales, sin inventar leyes, artículos ni plazos:

- **Términos**: Atlante intermedia y no opera embarcaciones; el operador (Pacific Experience u otro aliado) presta el servicio, cobra y responde por nave, tripulación, licencia y seguro; las condiciones de cada reserva son las del operador y mandan sobre lo que se vea en Atlante; Atlante no procesa pagos ni guarda datos de tarjeta; contacto por WhatsApp.
- **Privacidad**: qué datos se piden (nombre, WhatsApp, email, fecha, cantidad de pasajeros); para qué (gestionar la solicitud y transferirlos al operador para completar la reserva); que no viajan datos personales en la URL; cookies (idioma) y analítica (GA4 / Meta cuando estén activas); corrección y borrado por WhatsApp.
- **Cancelaciones**: la política es siempre la del operador; para productos de Pacific Experience se cita lo publicado el 09/09/2026 (charters: 30 % de abono, 70 % restante 24 h antes de navegar, reembolso completo dentro de las primeras 24 h tras pagar el abono; tours compartidos: 100 % al reservar) con enlace a PEX; para operadores aliados, la política de cada uno se muestra en su ficha; la decisión de zarpar por clima es del capitán y el operador.
- **Cómo funciona**: los tres pasos (eliges tu experiencia → fecha y pasajeros → tus datos), el pago en Pacific Experience o con el operador aliado, y el código de referido ATLANTE con la instrucción de pegarlo si el checkout lo pide.

### Configuración y SEO

- **`next.config.ts`**: `async redirects()` con 301 (`permanent: true`, Next emite 308) de `/compare`, `/tours/charter-atardecer-privado`, `/tours/yate-completo-taboga` y `/tours/charter-premium-las-perlas` → `/charters`; `/tours/travesia-al-atardecer`, `/tours/escape-a-taboga` y `/tours/expedicion-a-las-perlas` → `/tours`.
- **`src/app/sitemap.ts`**: sólo rutas que responden 200 — `/`, `/tours`, `/charters`, `/como-funciona`, `/terminos`, `/privacidad`, `/cancelaciones`. Se quitan `/compare` y las seis fichas, que ahora redirigen.
- **`src/app/robots.ts`**: `Disallow: /admin`.
- **`src/app/admin/layout.tsx`** (nuevo): `metadata.robots = { index: false, follow: false }` para todo `/admin`, incluido `/admin/login`.
- **`.env.example`** (nuevo) con una línea de comentario por variable y sin valores: `DATABASE_URL` (pooler 6543), `DIRECT_URL` (5432), `ADMIN_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_PEX_BASE_URL`, `PEX_HANDOFF_SECRET`, `PEX_WEBHOOK_SECRET`, `CRON_SECRET`. **`.gitignore`** necesitó `!.env.example` porque la regla `.env*` lo excluía.
- **`README.md`**: estado real (R0 hecho, R1–R4 según el PRD), sin menciones a reseñas, urgencia, multi-moneda ni popups, con la sección "Reglas" (nunca "Sunset"; Atlante nunca cobra; `buildPexUrl()` único).

### Archivos borrados

`src/lib/currency-context.tsx`, `src/components/tour/PriceCalculator.tsx`, `src/components/tour/CompareTable.tsx`, `src/app/(site)/compare/page.tsx`, `src/app/api/bookings/route.ts`.

`src/lib/bookings.ts` **se conserva**: `src/app/admin/actions.ts` importa `confirmBooking`, `markPaid` y `cancelBooking`. El bloque 2 rehace el admin.

## Qué no se hizo

- **No se tocó `src/config/site.ts` ni `src/lib/pex.ts`**: los puntos 1 y 2 del bloque ya estaban resueltos en `961d381` y el resultado coincide con lo pedido (dominio `.lat`, sin `email`, sin `trust`, sin `social.tripadvisor` ni `social.google`, WhatsApp intacto, `navItems` con `/tours`, `/charters`, `/#destinos`, `/como-funciona`, `/#contacto`).
- **Los seis precios inventados siguen en `src/content/tours.ts`** (`850`, `1450`, `2800`, `1200`, `1800`, `3200`). Es lo que pide la tarea 8 ("el archivo se reemplaza entero en el bloque 2; aquí sólo se ocultan los precios"), pero choca con la regla 15, que pide que esos valores no aparezcan en `src/`. Se optó por la instrucción específica. **Ninguno se renderiza**: el único código que los lee es `createBookingRequest()` en `lib/bookings.ts`, que se quedó sin llamadores al borrar `/api/bookings`. El bloque 2 borra el archivo.
- **No se creó el funnel, ni `/api/leads`, ni el catálogo en base de datos, ni fichas de naves**: son R1/R2.
- **No se ejecutó ninguna migración** ni se tocó la base de datos.

## Decisiones tomadas por ambigüedad (regla 12)

1. **Enlace de cancelaciones a PEX**: la tarea permite enlazar al home "si `/politicas` no existe en PEX". No está verificado que exista (el PRD 5.3 sólo da por verificadas `/tours/<id>`, `/ferry/taboga` y `/charter/checkout`), así que se enlaza al **home** con `buildPexUrl({ target: "home", campaign: "cancelaciones" })`. Si Mark confirma la ruta, es cambiar una línea en `src/app/(site)/cancelaciones/page.tsx`.
2. **`filter_sunset` → `filter_evening`**: la tarea 7 sólo pedía cambiar el valor EN, pero el nombre de la clave contenía "sunset" y la verificación final exige 0 resultados. Se renombró la clave.
3. **Sitemap**: la tarea no lo menciona, pero listar siete URLs que ahora devuelven 301 es un error; se reescribió con las rutas que responden 200.
4. **CSS muerto**: junto con `.review-*`, `.popup-*`, `.quote` y `.urgency` se borró también `.compare-table` / `.compare-wrap`, que quedó sin uso al eliminar `/compare`.
5. **`locale-context.tsx`**: `npm run lint` fallaba con un error preexistente (`react-hooks/set-state-in-effect`) en el efecto de detección de idioma por navegador. Ese efecto era **código muerto** — sale con `if (initial) return` y el root layout siempre pasa un locale — así que se eliminó y `initial` pasó a ser obligatorio. La detección por navegador nunca funcionó; si Mark la quiere, hay que resolverla en el servidor con `accept-language` (queda anotado abajo).
6. **Fecha de las políticas de PEX**: se cita "09/09/2026" tal como lo indica el prompt y el PRD, aunque hoy es 08/09/2026. Ver PENDIENTE MARK.

## PENDIENTE MARK

| # | Tema | Detalle |
|---|---|---|
| 1 | **Buzón real** | `concierge@atlantedelpacifico.com` no existe y quedó fuera del sitio y del JSON-LD. Hoy el único canal es WhatsApp +507 6860 3623. Decidir buzón (`…@atlantedelpacifico.lat`, Gmail u otro) para volver a publicarlo. |
| 2 | **Instagram** | `site.social.instagram` apunta a `instagram.com/atlantedelpacifico`. **No está verificado que la cuenta exista.** Si no existe, hay que borrar la entrada o crear la cuenta. |
| 3 | **Logo de PEX** | El disclosure va sólo con texto. Autorizar (o no) el uso del logo de Pacific Experience. |
| 4 | **Dominio .com** | `atlantedelpacifico.com` no resuelve y ya no aparece en el código. Decidir: comprarlo y redirigir 301 al `.lat`, o no hacer nada. |
| 5 | **Razón social y RUC** | Los términos no nombran a la entidad que factura las comisiones porque no está definida. Sin eso, `/terminos` no puede salir de BORRADOR. |
| 6 | **Revisión de las 4 páginas legales** | Términos, privacidad, cancelaciones y cómo funciona están en BORRADOR con la franja visible. Falta la revisión de Mark (idealmente legal) antes de quitarla. |
| 7 | **Ruta de políticas en PEX** | ¿Existe `pacificexperience.lat/politicas`? Hoy `/cancelaciones` enlaza al home de PEX. |
| 8 | **Fecha de las políticas citadas** | El prompt y el PRD fechan los datos de PEX el **09/09/2026**, pero hoy es **08/09/2026**. Confirmar la fecha correcta antes de publicar; aparece literal en `/cancelaciones`. |
| 9 | **Horario de respuesta por WhatsApp** | No se publica ninguna promesa de tiempo de respuesta (la métrica "14 min" era inventada). Si Mark da un horario real, se puede publicar como hecho verificable. |
| 10 | **Detección de idioma por navegador** | Se retiró el código muerto que decía hacerlo. Si se quiere, se implementa en el servidor leyendo `accept-language` cuando no hay cookie (R4, junto con `hreflang`). |
| 11 | **Contenido de las secciones del home** | `ValueProps`, `About`, `FaqSection` y `Destinations` conservan el copy heredado del sitio anterior. No contiene métricas ni precios, pero describe a Atlante como concierge, no como broker. Revisar en R1. |

## Cómo probarlo

```bash
npm install
npm run lint     # 0 errores, 0 warnings
npm run build    # compila; 15 rutas
npm run dev      # http://localhost:3000
```

Verificaciones ya corridas en este bloque:

| Comprobación | Resultado |
|---|---|
| `npm run lint` | limpio (0 errores, 0 warnings) |
| `npm run build` | ✓ compila |
| `npx tsc --noEmit` | limpio |
| `grep -rni "sunset" src/` | **0** |
| `grep -rn "atlantedelpacifico\.com" src/` | **0** |
| `grep -rn "ATLANTE10" src/` | **0** |
| `grep -rn "Pocos cupos" src/` | **0** |
| `grep -rni "127 rese\|aggregateRating\|googleRating\|reviewCount" src/` | **0** |
| `850\|1450\|2800\|1200\|1800\|3200` en `src/` | 6 en `content/tours.ts` (ninguno se renderiza, ver "Qué no se hizo"); `1200` también aparece como ancho de imagen OG en `layout.tsx` y en la ficha |
| `pacificexperience.lat` fuera de `src/lib/pex.ts` | **0** |

A mano, en 390 px de ancho:

1. **Home** — el hero muestra el lede de broker y dos botones (`/tours`, `/charters`), **sin** fila de métricas. Justo debajo, la franja "Atlante del Pacífico es agente autorizado de Pacific Experience…". Ninguna tarjeta muestra precio ni "Pocos cupos". El header no tiene selector de moneda. El footer tiene las cuatro páginas legales y el disclosure.
2. **`/tours` y `/charters`** — cargan con su disclosure y sus tarjetas sin precio.
3. **`/tours/travesia-al-atardecer`** — debe redirigir a `/tours` (301). Igual las otras cinco fichas y `/compare` → `/charters`.
4. **`/terminos`, `/privacidad`, `/cancelaciones`, `/como-funciona`** — abren con la franja BORRADOR. Cambiando el idioma a EN con el toggle del header, el contenido cambia entero.
5. **Enlaces a PEX** — el del disclosure debe terminar en `?ref=ATLANTE&utm_source=atlante&utm_medium=referral&utm_campaign=disclosure`.
6. **`/robots.txt`** — debe traer `Disallow: /admin` y el sitemap en `www.atlantedelpacifico.lat`. **`/sitemap.xml`** — siete URLs, ninguna que redirija.
7. **Ficha de producto** — el panel derecho no muestra precio ni depósito ni formulario, sólo duración y "Consultar por WhatsApp".
8. **Sin base de datos** — con `DATABASE_URL` ausente, todo lo anterior funciona igual: ninguna página pública toca Prisma.
