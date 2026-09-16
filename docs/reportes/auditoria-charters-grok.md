# Auditoría — Charters MVP (Grok)

Fecha: 2026-09-16 · Rama de este reporte: `cursor/auditoria-charters-c66b` · Código auditado: `main` @ `02bc0fa` (Charter MVP: independent Atlante + PagueloFácil 30% deposit) · Producción observada: `https://www.atlantedelpacifico.lat` (deployment `dpl_DPGsj5o5yKzpYXmx6Wv5LfkJL4eQ`).

**Esto no es un bloque de features.** No se agregó catálogo, checkout ni copy comercial. El único cambio de código en este PR es quitar `public/logo.png` (logo de Pacific Experience servido en claro en `/logo.png`). El resto es revisión.

El archivo `docs/reportes/bloque-08.md` **no existe en `main`**. El brief de auditoría vive en `feature/atlante-broker` como `docs/bloques/08-R6-auditoria.md`. Este reporte usa las mismas categorías (SEO, rendimiento, seguridad, calidad de código) y el tono de los reportes de bloques 1–6 de esa rama.

Verificación local (sin `DATABASE_URL`, sin secretos de PagueloFácil):

| Comprobación | Resultado |
|---|---|
| `npm run build` | ✓ Next.js 16.2.10 · 18 rutas |
| Páginas dinámicas vs estáticas | Casi todo `ƒ` (dinámico). Sólo `○` `/robots.txt` y `/sitemap.xml` |
| `GET /charters/pacific-ferry` y `/charters/sirena-del-mar` | 200 |
| `GET /charters/happy-ending`, `/charters/ana-c`, `/charters/aura` | 404 |
| `POST /api/charters/reservar` 4 h + `depositAmount: 1` desde el cliente | servidor ignora el monto · `depositAmount: 390` |
| `POST` 8 h | `depositAmount: 0`, `checkoutUrl: null` |
| `POST` `happy-ending` / `aura` | 400 `unknown_charter` |
| `POST /api/payments/paguelofacil/webhook` con Oper inventado | 200 `{ received: true }` **sin** marcar pagado (no hay DB; el código exige S2S) |
| Producción `GET /api/payments/paguelofacil/availability` | `{ "available": false }` — **PagueloFácil no está cableado** |
| Móvil 390×844 (Chromium, `next start`) | fichas sin scroll horizontal de documento; varios controles &lt; 44 px (§7) |

**No se hizo merge a `main` ni deploy.**

---

## Resumen ejecutivo

El MVP de `/charters` **sí existe** y, en lo que es código de cobro, está mejor de lo que el miedo del webhook sugería: PagueloFácil no acredita un abono porque “llegó un POST”. Confirma contra `MerchantTransactions` y compara el monto con el lead. El cliente **no** puede fijar el precio.

Eso no alcanza para vender de verdad.

1. **Producción no puede cobrar.** El probe público de la pasarela responde `available: false`. Sin `DATABASE_URL` el lead de prueba no se persiste (sólo `console.log`) y no se crea enlace de pago.
2. **Siguen vivos `/tours/[slug]` y `/compare`** con precios inventados ($850, $1,450, $2,800, $1,200, $1,800, $3,200) y copy de “reserva ahora, paga el resto después”, mientras el home dice que Tours está “Próximamente”.
3. **Prueba social inventada en el home:** 4.9 ★ · 127 “reseñas verificadas”, JSON-LD `aggregateRating`, popup `ATLANTE10`. Nada de eso tiene fuente.
4. **Las 9 naves de terceros no tienen precio público** (bien), pero el índice las lista con la misma foto OG, el copy “cuando Mark cargue datos”, y una décima nave **ANA C** que no está en las 11 de lanzamiento.
5. **Pacific Ferry / Sirena** tienen capacidad y marina alineadas con el catálogo verificado de PEX del 2026-09-09 (rama `feature/atlante-broker`), pero el cobro aplana la tabla real a **un solo $1,300 / 4 h** para cualquier tamaño de grupo. En esa tabla, 4 h de Pacific Ferry 1 para hasta 30 pax era **$1,790**, no $1,300.
6. **Marca en texto de UI: 0 menciones a PEX.** Marca en assets: el logo de The Pacific Experience estaba en `public/logo.png` (HTTP 200 en producción). El favicon sigue siendo un velero celeste, no el tridente verde/dorado.

Veredicto: **no está listo para el primer cobro real ni para tráfico pagado.** El camino de solicitud + disclaimer de 24 h está escrito. Faltan pasarela, persistencia, ops (el admin no lista `CharterRequest`) y apagar el catálogo fantasma de tours.

---

## Parte 1 — Checklist pedido

Cada punto: **Cumple** / **No cumple** / **Parcial**, con archivo y razón.

### 1. Datos inventados

**Parcial** (las 9 terceras están limpias en precio público; el resto del sitio no).

#### 1.1 Naves de terceros (9 de lanzamiento)

Nombres en `src/data/charters.ts` vía `placeholder()`: Happy Ending, Sun Cat, Hatteras, Rapport, King Fish, Happiness, Yate Carver 54 Periboat, Diamond of the Sea, Endeavour.

| Dato | ¿Inventado en el objeto? | ¿Sale al cliente? |
|---|---|---|
| Precio / bloques 4-8-12 h | No (`durations: []`, `sampleTotalUsd` ausente) | No. Tarjeta: “Tarifas al publicar ficha” |
| Capacidad | No (`maxPax: null`) | No |
| Marina | **Sí en datos:** `placeholder()` copia `DEPARTURE` = Marina Flamenco para todas | **No se renderiza** en `CharterCard` ni hay ficha (404) |
| Foto | Placeholder `og-atlante.jpg` | Sí — la misma imagen de marca en las 9 |

Fichas `/charters/{slug}` de esas naves: **404** (sólo `liveCharters` en `generateStaticParams` + `getLiveCharter`). No hay fuente citada porque no hay spec. Eso cumple la regla para precio/capacidad **públicos**.

Hallazgo de dato igual de realista-pero-sin-fuente, aunque no se vea:

- **Marina Flamenco asignada en código a operadores terceros** (`src/data/charters.ts` L84–87 y L104). Hoy no se imprime; el día que alguien pase un placeholder a `live` sin tocar `departure`, se publica una marina no verificada.
- Copy interno al público en `/charters`: “Se publican cuando **Mark** cargue datos” (`src/app/(site)/charters/page.tsx` L37).

#### 1.2 ANA C — fuera de las 11

`placeholder("ANA C", "ana-c")` está en el array. No es Pacific Ferry 1, ni Sirena, ni una de las 9. Sale en “Próximamente” en producción. **Dato de flota no pedido.** Fuente: NO ENCONTRADO en el brief de las 11.

#### 1.3 Pacific Ferry 1 y Sirena del Mar (propias PEX — datos verificados el 2026-09-09)

Fuente interna del mismo repo, rama `feature/atlante-broker`, `src/content/catalog.ts` y `src/content/vessels.ts`, `verifiedAt: "2026-09-09"`, `sourceUrl` hacia las fichas de PEX. **Esa fuente no está citada en el MVP actual.** El archivo vigente dice `TODO_MARK` como si no hubiera tarifa.

| Dato en `src/data/charters.ts` hoy | ¿Tiene fuente? | Qué hace el MVP |
|---|---|---|
| Nombre “Pacific Ferry” (sin “1”) | El verificado es **Pacific Ferry 1** | Nombre recortado en UI |
| `maxPax` 30 / 80 | Sí (PEX 2026-09-09) | Se muestra “Hasta ~30 / ~80” |
| Marina Flamenco, Amador | Sí | Se muestra |
| `citedRangeUsd` 1300–1790 (Ferry) | 4 h · 15 pax = 1300 y 4 h · 30 pax = 1790 en PEX | Se muestra como “Rango citado” **sin decir de dónde** ni que el rango 8 h/12 h llega a $3,550 |
| `citedRangeUsd` 1300–5380 (Sirena) | Extremos de la tabla PEX (4 h/15 = 1300, 12 h/80 = 5380) | Igual: “rango citado” opaco |
| `sampleTotalUsd: 1300` en **todas** las 4 h | En PEX, $1,300 es el tramo **hasta 15 pax**, no el de 30 u 80 | El formulario cobra **$390 (30 % de 1,300)** aunque el cliente ponga 30 o 80 personas |
| 8 h y 12 h `null` | PEX **sí** publicaba bloques (Ferry Taboga 8 h 15/30 = 1700/2250; Perlas 12 h 15/30 = 3000/3550; Sirena hasta 4080/5380) | UI: “por confirmar”; API: `depositAmount: 0`, sin cargo PF |
| Includes genéricos (barco, capitán, combustible, chalecos) | PEX listaba hielo, coolers, agua/sodas, BBQ, toallas, salón/A/C, etc. | Versión recortada **sin citar** qué se omitió |

Aura está fuera del catálogo (correcto).

**Conclusión del punto 1:** no se inventaron tarifas para las 9 terceras en lo que el cliente puede reservar. Sí hay datos sin fuente o aplanados: marina en placeholders, ANA C, nombre sin “1”, cobro 4 h a tarifa de 15 pax, includes recortados, y el catálogo viejo de tours (§6).

#### 1.4 Prueba social y promociones (inventadas, no son naves)

| Qué | Archivo | Fuente |
|---|---|---|
| 4.9 / 127 reseñas “verificadas”, “recopiladas automáticamente” | `src/config/site.ts`, `src/content/reviews.ts`, `src/components/sections/ReviewsSection.tsx`, JSON-LD del home | NO ENCONTRADO |
| Citas Mariana G. / David R. / Sofía & Luis (Google, TripAdvisor) | `src/content/reviews.ts` | Seed de Phase 1. No hay reseñas reales de Atlante |
| Quote del bloque Nosotros (misma frase que Mariana G.) | `src/components/sections/About.tsx` | Igual |
| Popup 10 % y código `ATLANTE10` | `src/components/marketing/LeadPopups.tsx`, `src/app/api/lead/route.ts` | El endpoint **no guarda** el email (sólo `console.log`) y **no envía** correo. El UI dice “revisa tu correo” |
| Trust row “+200 experiencias”, “14 min respuesta” | `src/config/site.ts` `trust` | NO ENCONTRADO |
| Destinos: “12 millas náuticas”, “tres horas costeando” | `src/components/sections/Destinations.tsx` | Sin `verifiedAt`. En el bloque 6 de la otra rama **se quitaron** precisamente esas cifras |

---

### 2. Seguridad del webhook de pago

**Cumple** (el caso que pediste: no se acredita un abono por un POST crudo).

No hay firma HMAC ni allowlist de IPs en la documentación de PagueloFácil. Este código **no** trata el webhook como verdad:

1. `POST /api/payments/paguelofacil/webhook` (`src/app/api/payments/paguelofacil/webhook/route.ts`) parsea `Oper` / `PARM_1` como **pistas**.
2. Carga el lead por `PARM_1`.
3. Llama `verifyPagueloFacilTransaction(oper)` → `GET {verifyUrl}/rest/merchant-transactions?filter=codOper::…` con el **token crudo** en `Authorization` (`src/lib/paguelofacil.ts`).
4. Exige status aprobado (incluye numérico `1`), monto ≈ `lead.depositAmount` (±1.5 ¢) y, si S2S trae `PARM_1`, que coincida con el id del lead.
5. `GET /api/payments/paguelofacil/return` hace lo mismo: params del browser = pistas.

Un `curl` con Oper inventado responde 200 `{ received: true }` (ACK para que PF no reintente en tormenta) y **no** cambia estado. Comprobado en local.

**No es un hallazgo crítico del tipo “reservar gratis con curl”.** No hay commit de parche de webhook en este PR.

Endurecimiento pendiente (no bloquea el juicio de “¿confía en el body?”):

| Hueco | Archivo | Riesgo |
|---|---|---|
| Si S2S **no** devuelve `PARM_1`, un Oper **real** de otro lead con el **mismo** monto podría aplicarse a un segundo lead (`if (verified.parm1 && …)` se salta) | webhook + return | Reuso de un pago auténtico, no un Oper falso |
| `paguelofacilOperationId` **no es unique** | `prisma/schema.prisma`, `prisma/charter-requests.sql` | El mismo Oper puede grabarse en dos filas |
| Sin cron de conciliación (el TODO del port de PEX) | `src/lib/paguelofacil.ts` | Si falla el webhook y el return, el abono queda `unpaid` aunque PF cobró |
| Probe `GET /api/payments/paguelofacil/availability` es público | `availability/route.ts` | Confirma a cualquiera si hay CCLW+token |

---

### 3. Persistencia del lead

**Parcial.**

Flujo correcto en código: `POST /api/charters/reservar` llama `createCharterLead` **antes** de Pedir el enlace de PagueloFácil (`src/app/api/charters/reservar/route.ts`). Si el usuario cierra la pestaña en el checkout de PF, la fila **puede** existir en Postgres como `unpaid`.

Condiciones que lo rompen:

| Situación | Qué pasa | ¿El cliente tiene número de solicitud? |
|---|---|---|
| Sin `DATABASE_URL` (producción de PF hoy no cobra; local igual) | `console.log("[charter-lead]", …)` y `persisted: false`. No hay PF link | Se genera un `token` en la URL de `/gracias`, pero `getCharterLeadByToken` no encuentra nada. **No se muestra el id.** El texto dice “Guardamos tu solicitud” — puede ser mentira |
| `prisma.create` lanza | Se traga el error, `persisted: false`, mismo mensaje | Igual |
| Con DB, pago PF a medias | Lead `unpaid` en `CharterRequest` | `/gracias` **no imprime** `id` ni `token` (`src/app/(site)/reservar/[slug]/gracias/page.tsx`). WhatsApp prefill nombra la nave, no el número |
| Admin | `src/app/admin/(dash)/page.tsx` y `bookings/page.tsx` leen el modelo **`Booking`**, no `CharterRequest` | Ops **no ve** el abono de charters en el dashboard |

El formulario de concierge del home (`ContactSection`) **no** pega en DB: abre WhatsApp. `/api/lead` del popup tampoco persiste (el modelo `Lead` de Prisma no se usa).

**No hay número de solicitud usable para rescate por WhatsApp** en la pantalla que ve el cliente.

---

### 4. Marca (cero PEX al cliente)

**Parcial.**

`grep` en lo que renderiza el App Router (tsx/css/copy), case insensitive, de `PEX`, `Pacific Experience`, `pacificexperience`:

| Dónde | ¿Sale al visitante? |
|---|---|
| `src/components/**/*.tsx`, `src/app/(site)/**`, `src/lib/i18n.ts`, `src/data/charters.ts`, `src/content/*` | **0** coincidencias |
| `README.md`, `.env.example`, comentarios de `src/lib/paguelofacil.ts` | Sí, “PEX”, pero no es UI |
| `public/logo.png` | **Sí.** PNG “The PACIFIC Experience” + ola celeste. En producción: `200` `https://www.atlantedelpacifico.lat/logo.png`. **Ningún componente lo enlazaba**; igual era URL pública. **Este PR lo borra** (commit aparte) |
| `public/favicon.png` y `layout.tsx` `icons.icon` | Velero **celeste**, no el tridente verde/dorado de `og-atlante.jpg` |
| Dominios Vercel | `*.pacificexperience.vercel.app` (slug del team). El dominio custom es `www.atlantedelpacifico.lat` |
| Hosted checkout de PagueloFácil | No medible aquí. Si las credenciales son las de PEX, **el nombre del comercio en la pasarela lo ve el cliente**. PENDIENTE MARK |

CSS del sitio: `--ink` `#0a2421` / `--gold` `#d7a85b` / `--bronze` `#b8733a` / marfil. No es el celeste de PEX en las páginas. El favicon sí lo es.

Fichas de Pacific Ferry y Sirena: no dicen “Pacific Experience” ni “operado por”. Cumplen esa frase. El recorte del nombre a “Pacific Ferry” parece una precaución de marca; el brief pide **Pacific Ferry 1**.

---

### 5. Monto del cobro

**Parcial** (no se manipula desde el cliente; el servidor usa un total de muestra aplanado).

- El body de `/api/charters/reservar` **no** acepta `amount` / `depositAmount`. El servidor hace `depositFromSample(duration.sampleTotalUsd)` en `src/lib/charter-requests.ts`. Prueba: POST con `"depositAmount": 1` → respuesta `390`.
- Nave no live o sin duration → 400, no se cobra.
- Sin `sampleTotalUsd` (8 h / 12 h hoy): `depositAmount: 0`, **no** se crea LinkDeamon (`lead.depositAmount < 1 \|\| lead.sampleTotalUsd == null`). El botón pasa a “Enviar solicitud”. Eso es el desvío a WhatsApp, no un monto inventado para PF.
- **Pero** 4 h **sí** crea cargo (cuando DB+PF existan) sobre **$1,300**, que en la tabla verificada de PEX es el tramo de **hasta 15 personas**. Un grupo de 30 en Pacific Ferry 1 debería ser $1,790 (abono $537), no $390. Un grupo de 80 en Sirena, 4 h, era $3,410 (abono $1,023). Hoy el form deja `max={maxPax}` 30/80 y cobra como si fueran 15.

`pricesAreSample: true` viaja siempre en la API, incluso cuando hay cifra. La UI dice “referencia”, no “tarifa del operador”.

---

### 6. Alcance (`/tours`, `/compare`, ferry)

**No cumple.**

| Ruta | Estado real | Precios |
|---|---|---|
| `/` | Charters vivos; Ferry y Tours como “Próximamente” | Home no lista tours |
| `/charters` | Catálogo pedido | Sólo 2 naves live con “desde $1,300” |
| `/tours` (índice) | **404** | — |
| `/tours/[slug]` | **200** en producción. `src/app/(site)/tours/[slug]/page.tsx` + `src/content/tours.ts` | $850 / $1,450 / $2,800 / $1,200 / $1,800 / $3,200 **sin `verifiedAt`**. JSON-LD `Offer` + `InStock` |
| `/compare` | **200**. `CompareTable` lee `tours` | Los mismos precios, tabla pública |
| Nav header/footer | No enlaza `/tours` ni `/compare` | Descubrible por URL, sitemap no las lista, **robots permite /** |
| `PriceCalculator` | “Reserva ahora, paga el resto después” + `POST /api/bookings` | Contradice el modelo de solicitud a 24 h |
| `prisma/seed.ts` | 60 días de cupos para esos slugs + cupón `WELCOME10` | Inventario de tours de mentira si alguien corre seed |

`ToursSection.tsx` sigue en el repo (enlace a `/compare`) pero **no** está montado en el home. El código muerto sigue desplegable.

---

### 7. Responsive 390 px (fichas reales)

**Parcial.**

Medición Chromium 390×844 sobre `next start` (producción local), rutas `/charters/pacific-ferry` y `/charters/sirena-del-mar`:

| Criterio | Resultado |
|---|---|
| Scroll horizontal del documento (`scrollWidth > clientWidth`) | **No** (390 = 390) en home, índice, ambas fichas y `/reservar/pacific-ferry` |
| Botón primario del form (`.button-primary`, `min-height: 46px`) | ≥ 44 px |
| `.nav-toggle` | **42×42** |
| `.nav-cta` “Ver charters” | alto **42** (media 900 px lo baja de 46) |
| Toggle ES/EN | **~37×29** |
| `.card-link` “Ver y reservar” (home / índice) | alto **18** |
| FAQ `<summary>` | alto **33** |
| Header | Marca + CTA + hamburguesa muy justos; la marca se recorta visualmente. El menú abierto no desborda el documento |

En `feature/atlante-broker` el bloque 6 ya había subido `.card-link`, nav del pie y `summary` a 44 px. **Ese arreglo no está en `main`.**

Galería: tres copias de `og-atlante.jpg` en columna (el grid pasa a 1 col &lt; 540 px). No hay foto de nave. No hay scroll horizontal por la tabla de precios.

---

### 8. Accesibilidad — contraste AA

**Parcial.** No se cambió ningún token de marca en este PR (un ajuste de contraste sería **cambio de marca**, no un parche CSS silencioso).

Contraste relativo calculado sobre `:root` de `src/app/globals.css`:

| Par | Ratio | AA texto normal (4.5:1) | Dónde se usa |
|---|---|---|---|
| Tinta `#0a2421` sobre marfil `#f8f3e8` | 14.74 | Pasa | Cuerpo en secciones claras |
| Marfil sobre tinta | 14.74 | Pasa | Hero, secciones oscuras |
| Oro `#d7a85b` sobre tinta | 7.49 | Pasa | Eyebrow del hero, enlaces en oscuro |
| Oro sobre marfil | 1.97 | **Falla** | No es el par principal de UI; peligro si se usa como texto sobre claro |
| Bronce `#b8733a` sobre marfil | 3.42 | **Falla** (pasa sólo “large”) | `.eyebrow`, `.fact`, `dt` de ficha, `.card-link` en tarjetas claras — **12 px uppercase** |
| Marfil sobre bronce (`.button-primary`) | 3.42 | **Falla** para el texto del botón | CTA “Pagar abono 30 %”, “Ver charters” del hero |
| Tinta sobre bronce | 4.31 | Falla normal / pasa large | — |
| `rgba(ink,.55)` sobre marfil (helper de precio) | 3.66 | **Falla** | `.card-price small`, `.price-table small`, pie del form |
| `rgba(ink,.62)` (`.muted-copy`) | 4.50 | Pasa en el límite | Notas de ficha |

**Si en el futuro se oscurece el bronce o se pone texto tinta sobre el botón, hay que tratarlo como decisión de marca de Mark**, no como “fix de a11y”.

Otros a11y (categoría D11 del brief de bloque 8, estado actual):

- No hay skip link.
- No hay `:focus-visible` definido en `globals.css`.
- Inputs del form de charter **sí** van con `<label>`.
- JSON-LD `aggregateRating` 4.9/127 es dato falso (también es problema de rich results de Google).
- `html lang` sale de cookie `locale` en la **misma URL** (Google indexa una sola variante).

---

### 9. Otros hallazgos (categorías del bloque 8)

#### A. SEO técnico

| ID | Hallazgo | Estado | Archivo |
|---|---|---|---|
| A1 | `alternates.canonical: site.url` en el **layout raíz** | Sigue. Toda página sin canonical propio se declara duplicado del home | `src/app/layout.tsx` |
| — | `/charters` y fichas live **sí** pisan canonical | Parche local, no global | `charters/page.tsx`, `charters/[slug]/page.tsx` |
| A2 | `sitemap.ts` usa `lastModified: new Date()` | Sigue. El XML “cambia” en cada hit | `src/app/sitemap.ts` |
| — | Sitemap de producción lista sólo `/`, `/charters`, las 2 fichas live (correcto para alcance). `/tours/*` y `/compare` **no** están, pero son 200 | Parcial | prod `sitemap.xml` |
| A3 | `metadata.keywords` sigue | Sigue | `layout.tsx` |
| A4 | Español sin tildes: “Pacifico”, “Panama”, “resenas”, “deposito”, “Como reservo” | Sigue en i18n, FAQ, metadata | `src/lib/i18n.ts`, `FaqSection.tsx`, `layout.tsx` |
| A5 | JSON-LD `TravelAgency` + **`aggregateRating` 4.9/127 inventado**; tours `Offer` con precio inventado | Sigue | `src/app/(site)/page.tsx`, `tours/[slug]/page.tsx` |
| A6 | Idioma por cookie, no `/en/*` | El trabajo de hreflang de la rama broker **no** está en `main` | `layout.tsx`, `locale-context.tsx` |
| — | `robots.ts` `Allow: /` | Indexa `/admin/login`, `/compare`, `/tours/*`, `/api/*` si alguien las descubre | `src/app/robots.ts` |

#### B. Rendimiento

| ID | Hallazgo | Evidencia |
|---|---|---|
| B1 | Layout llama `cookies()` → **todas** las páginas de marketing son dinámicas | Tabla del build: `/`, `/charters`, fichas, compare, tours = `ƒ`. No hay ISR |
| B2 | `og-atlante.jpg` 397 KB como hero CSS, galería `<img>` y OG. Sin `next/image` | `CharterFicha.tsx` `eslint-disable` + `background-image` |
| B3 | `globals.css` ~1,560 líneas + Tailwind casi sin usar; clases muertas de reviews/popup/urgency/leaflet siguen porque **esos componentes siguen montados** | `ReviewsSection`, `LeadPopups`, `RouteMap` |
| B4 | `--font-serif: Georgia`; `Inter` en `body` sin `next/font` (FOIT del sistema / fallback) | `globals.css` |
| B5 | `WeatherWidget` pega a Open-Meteo **desde el browser** en cada ficha de tour (las de charter no lo montan) | `WeatherWidget.tsx` |
| B6 | Analytics inerte sin env — OK | `Analytics.tsx` |
| — | `leaflet` + `react-leaflet` en `package.json` sólo para tours | Peso en el bundle de `/tours/[slug]` |

#### C. Seguridad (además del webhook)

| ID | Hallazgo | Notas |
|---|---|---|
| C1 | `next.config.ts` vacío: no hay CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`. Vercel sí manda HSTS. `X-Powered-By: Next.js` en HTML | Prod headers de `/charters/pacific-ferry` |
| C2 | Admin HMAC OK en espíritu. `AUTH_SECRET` **no** está en `.env.example` (sí `ADMIN_PASSWORD` comentado). Sin rate-limit de login. `checkPassword` sale pronto si las longitudes difieren (filtración de timing menor) | `src/lib/auth.ts`, `.env.example` |
| C3 | `/api/charters/reservar` devuelve `e.message` al cliente (`unknown_charter`, etc.). Aceptable para validación; 500 no debería filtrar stack — hoy manda el `Error.message` | `reservar/route.ts` |
| — | Sin rate-limit en reservar / webhook / lead | Spam de leads o ACK flood |
| — | Repositorio **público** (`githubRepoVisibility: public`) | `docs/` de este PR será visible; no hay secretos en `.env.example` |
| — | `npm audit`: **1 critical** (Next.js middleware/proxy bypass en App Router + Turbopack + single locale), 9 high (prisma/config, sharp/libvips, nanoid, postcss, js-yaml, …) | Dev + transitive. Documentado, no parcheado aquí |
| C6 | `prisma/seed.ts` crea `WELCOME10` si alguien siembra prod | Cupón demo |

No se tocó el webhook (punto 2 cumple). No hay segundo commit de “fix crítico de pago”.

#### D. Calidad de código

| ID | Hallazgo |
|---|---|
| D1 | Locale = cookie + `localStorage` + `navigator` en cliente vs `cookies()` en servidor. Riesgo de hidratación ES/EN |
| D2 | Decenas de `style={{…}}` (ficha, form, home) |
| D3 | Diccionario + strings sueltos `locale === "es" ?` en `CharterFicha`, `FaqSection`, `gracias` |
| D4 | Fechas `T00:00:00.000Z` y “hoy” UTC, no `America/Panama` (`date_in_past` puede bloquear el día local) |
| D6 | Prisma: `Booking`, `AvailabilitySlot`, `Customer`, `Coupon`, `GiftCard`, `Review`, `Reseller` no alimentan el MVP de charters. `db.ts` instancia `PrismaClient` al importar (el admin revienta sin `DATABASE_URL`; `charter-requests.ts` sí es lazy) |
| D7 | `leaflet` sobra para el alcance charter. `package.json#prisma` deprecado (warning en cada generate) |
| D8 | Sin `poweredByHeader: false`, sin `engines`/`nvmrc`, sin tests, sin CI en `main` |
| D9 | Sin `error.tsx` / `not-found.tsx` propios |
| D10 | Cero tests. La rama broker tenía 156; **no viajaron a `main`** |
| — | `createCharterLead` loguea WhatsApp y nombre en claro en serverless logs |
| — | Descripción PF: ``Abono 30% ${boatName}`` — si el merchant es compartido, el extracto puede decir “Pacific Ferry” en la cuenta PEX |

---

## Tabla de rutas del build (`npm run build`)

```
ƒ /  /admin*  /api/*  /charters  /charters/[slug]
ƒ /compare  /reservar/[slug]  /reservar/[slug]/gracias  /tours/[slug]
○ /robots.txt  /sitemap.xml
```

18 rutas. Ninguna página de marketing es estática.

---

## Qué se corrigió en este PR (mínimo)

| Commit | Qué | Por qué no se silenció |
|---|---|---|
| (aparte de los docs) | Borrado de `public/logo.png` | Era el logo de Pacific Experience en URL pública. No se usa en componentes. **No se reemplazó por otro archivo** (no hay asset de Mark para un logo PNG). |

No se apagaron `/tours` ni `/compare` por código: es decisión de producto (ver recomendaciones). No se tocaron colores de marca.

---

## PENDIENTE MARK (auditoría, no código)

Trasladado y ampliado en `docs/recomendaciones-lanzamiento-charters.md` §4. Aquí el recorte que salió de **medir**, no de opinar:

1. ¿Se pueden usar las tablas PEX del 2026-09-09 (ruta × horas × cupo) para cobrar, **sin** nombrar a PEX en la ficha?
2. ¿El comercio que verá el cliente en PagueloFácil es “Atlante” o el merchant de PEX?
3. ¿Pacific Ferry 1 o “Pacific Ferry”?
4. ¿ANA C sale o no?
5. ¿Se borran reseñas 4.9/127 y el popup ATLANTE10 antes de pagar ads?
6. Texto legal final del disclaimer (el actual está “locked” en código; no es un dictamen de abogado).
7. Tildes en “Pacífico” / “Panamá” como marca.
8. Oscurecer el bronce para AA (eso **se ve** distinto).
9. Repo público vs privado.
10. Quién confirma con el operador en 24 h, y cómo se ve esa cola si el admin no lista `CharterRequest`.
