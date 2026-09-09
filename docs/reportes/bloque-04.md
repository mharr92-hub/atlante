# Bloque 4 — R2 · Marketplace de charters

Fecha: 2026-09-09 · Rama: `feature/atlante-broker` · Sin push, sin merge, sin deploy, sin tocar Vercel ni Supabase, sin ejecutar migraciones contra ninguna base de datos.

**Estado del bloque: `/charters` es ya el marketplace completo con las tres naves de Pacific Experience.** No hay naves ni operadores aliados porque no existen todavía: el modo de cierre `quote` y la ruta `/cotizar/[slug]` están escritos y probados, pero hoy ninguna nave los usa. El alta de aliados (`/aliados/registro` → `/admin/aliados`) es el camino por el que entrarán.

Commits del bloque (sobre `fe343a8`):

| SHA | Sub-bloque |
|---|---|
| `1c61153` | Modelo de operadores y naves, migración `0004_charters`, seed y libs de charter (4.1) |
| `7716ba4` | `/charters` con filtros y precio por persona, ficha, comparador, cotización y aliados (4.2) |
| `b714af1` | Admin de naves, operadores y aliados, y estados de cotización en leads (4.3) |
| `65be8ea` | Tests del marketplace, humo del bloque y contraste legible al sol (4.4) |
| (este) | Reporte |

| Comprobación | Resultado |
|---|---|
| `npm run lint` | limpio (eslint + `check:pex-links`) |
| `npm run test` | **113/113** (88 antes del bloque) |
| `npm run build` | ✓ compila, 39 rutas + proxy |
| `npx tsc --noEmit` | limpio |
| `npx prisma validate` | ✓ |
| Lighthouse móvil `/charters` | **rendimiento 98 · accesibilidad 100 · buenas prácticas 100 · SEO 100** |

---

## 1. Variables de entorno

**Ninguna nueva.** El bloque no necesita ningún servicio ni secreto que no existiera ya; `.env.example` queda igual. La comisión con el operador se guarda en `Operator.commissionPct` (interna, en el admin) y sigue cayendo a `ATLANTE_COMMISSION_PCT` (20 % por defecto) cuando no está fijada.

---

## 2. Qué se hizo, por archivo

### 2.1 Modelo (4.1)

- **`prisma/schema.prisma`**: `Operator` (slug único, nombre, WhatsApp, email, `commissionPct`, `contractSignedAt`, `ampLicense`, `insuranceUntil`, `verified`, `active`) y `Vessel` (slug único, `operatorId`, nombre, tipo, `lengthFt`, `capacityMax`, `marina`, `pricing` Json, `routes` Json, `includes` Json, `onRequest` Json, `depositPct`, `cancellationPolicy` Json `{es,en}`, `photos` Json, `video`, `closeMode`, `pexVesselSlug`, `pexPath`, `verifiedAt`, `sourceUrl`, `active`, `order`), tal como los define el bloque. Añadidos además: `Vessel.pexPricePerPersonFrom`, `Vessel.summary` y `Vessel.description` (§5.4), `Lead.hours` y `Lead.occasion` (§5.3), y `PartnerApplication.kind` y `.message` (§5.5).
- **`prisma/migrations/0004_charters/migration.sql`**: generada con `prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma --to-schema-datamodel prisma/schema.prisma --script` (la copia del esquema anterior se borró después del diff). **Todo aditivo**: crea `Operator` y `Vessel`, añade cuatro columnas nullable y un índice. No toca ninguna columna existente, así que se puede aplicar sobre una base con datos. **No se ejecutó contra ninguna base.**
- **`src/content/vessels.ts`** (nuevo, 311 líneas): respaldo en código, con los tipos (`Vessel`, `Operator`, `PricingRow`, `OnRequestItem`, `CloseMode`, `OCCASIONS`), el operador `pex` y las tres naves con la tabla de precios completa del bloque 2 (§2.1). Es el segundo archivo —después de `content/catalog.ts`— donde `check:pex-links` tolera el dominio de PEX, y por el mismo motivo: ahí es el dato `sourceUrl`, no un `href`.

  | Nave | Tipo | Cap. | Filas de precio publicadas |
  |---|---|---|---|
  | `aura` | catamarán | 35 | Bahía 4 h ≤15 $1,300 · Taboga 8 h ≤15 $1,700 · Taboga 8 h ≤30 $2,250 |
  | `pacific-ferry-1` | ferry | 30 | Bahía 4 h ≤15 $1,300 / ≤30 $1,790 · Taboga 8 h ≤15 $1,700 / ≤30 $2,250 · Perlas 12 h ≤15 $3,000 / ≤30 $3,550 |
  | `sirena-del-mar` | (no publicado) | 80 | Bahía 4 h ≤15 $1,300 / ≤35 $1,950 / ≤80 $3,410 · Taboga 8 h ≤15 $1,700 / ≤30 $2,250 / ≤80 $4,080 · Perlas 12 h ≤15 $3,000 / ≤80 $5,380 |

  Las tres: Marina Flamenco (Amador), 30 % de apartado, `closeMode: "deeplink"`, `verifiedAt: 2026-09-09`, `sourceUrl` a su ficha en PEX. Eslora: NO ENCONTRADA en los tres casos → vacía.

- **`src/lib/vessels.ts`** (nuevo): la única puerta de entrada al marketplace, con el mismo patrón que `lib/catalog.ts` — lee `Vessel`/`Operator` de la base si hay filas y cae al respaldo en código si no, con caché en proceso de 60 s e invalidación desde el admin. Incluye `rowToVessel` / `rowToOperator` (validan campo a campo el JSON de la base), `vesselLabels()` y `commissionPctForVessel()`.
- **`src/lib/vessel-pricing.ts`** (nuevo, puro): `matchingRows`, `rowForGroup`, `cheapestRow`, `pricePerPerson`, `durationsOf`, `routesOf`, `filterVessels`, `sortByPricePerPerson`, `facets` y `operatorSealVisible`. Sin Prisma ni `server-only`: lo comparten el listado (cliente), la ficha, el comparador, la home y los tests.
- **`prisma/seed.ts`**: además del catálogo, siembra el operador y las tres naves por `upsert` de `slug`. Sigue siendo idempotente y **no pisa los campos internos** de un operador que ya existe (comisión, contrato, licencia AMP, seguro y `verified`): esos los edita Mark.
- **`scripts/check-pex-links.mjs`**: `src/content/vessels.ts` entra en la lista blanca del dominio, con la misma justificación que el catálogo.

### 2.2 Páginas públicas (4.2)

- **`/charters`** (`src/app/(site)/charters/page.tsx` + `components/charters/ChartersCatalog.tsx` + `VesselCard.tsx`): filtros de capacidad mínima, presupuesto máximo por barco, duración (4/8/12 h), ruta, tipo y marina, más el control **"¿Cuántas personas?"** que recalcula el precio por persona. Todo el estado vive en la URL (`?people=&cap=&max=&hours=&route=&type=&marina=&compare=`) con `history.replaceState`, así que un filtro se puede compartir y "atrás" funciona. Orden por precio por persona ascendente, con las naves sin tarifa para ese grupo al final. Tarjeta: foto, badge `Reserva directa` / `Cotizar`, nombre, **"desde $1,300 (4 h · hasta 15 pax)"**, **"desde $86.67 por persona · para 15 personas"**, tipo · capacidad · marina, CTA a la ficha y botón "Comparar". JSON-LD `ItemList`.
- **`/charters/[slug]`** (`+ components/charters/VesselDetail.tsx`): ficha estándar — tipo, capacidad, marina, rutas, descripción, **tabla de precios por ruta / jornada / capacidad**, nota con el "desde $X/persona" que publica PEX cuando lo publica, incluye, bajo solicitud con precio y unidad cuando existen, apartado y política de cancelación, galería, fecha de verificación y operador (con el sello sólo si corresponde). Panel lateral con el tramo más barato y CTA, más CTA fijo en móvil. JSON-LD `Product` + `Offer` con el precio real. `generateStaticParams` con las naves activas.
- **Formulario corto de charter** (`components/charters/CharterForm.tsx`): fecha, jornada (sólo las que la nave publica), personas (tope = capacidad), ocasión, nombre, WhatsApp, correo y la casilla obligatoria de transferencia de datos. Muestra el **precio del barco completo del tramo que cubre al grupo** con la nota de que el cobro lo hace PEX. Envía `POST /api/leads` con `AbortController` a 4 s y, en `deeplink`, salta a `/charters/[slug]/listo`. **Si la API falla, tarda de más o responde 5xx se continúa igual** con `ref=ATLANTE` sin `ref_id`: el handoff nunca se bloquea.
- **`/charters/[slug]/listo`** (`+ CharterListo.tsx` + **`components/funnel/ListoScreen.tsx`**): la misma pantalla del bloque 2 (código ATLANTE copiable, cuenta regresiva de 3 s, botón "Ir ahora", aviso `POST /api/leads/[id]/redirected` con `keepalive`, `noindex`). `ListoScreen` es el componente que ahora comparten la ticketería y los charters; `Listo.tsx` quedó como el envoltorio que arma el resumen del funnel. Añadido de paso: el payload de `sessionStorage` sólo se usa si su `slug` coincide con la pantalla.
- **`/charters/comparar?v=aura,sirena-del-mar&people=80`** (`+ CompareTable.tsx`): hasta 4 naves lado a lado — tipo, capacidad, marina, precio por 4 / 8 / 12 h, **precio por persona para el grupo indicado** (fila destacada, con su propio control de personas), apartado, política de cancelación, y la unión de "incluye" y "bajo solicitud" con ✓ / — por nave. Con `?v=` vacío explica cómo elegir naves.
- **`/cotizar/[slug]`** (`+ QuoteScreen.tsx`): para `closeMode = "quote"`. El mismo formulario crea un lead `charter_partner` en estado `quote_requested` y ofrece **abrir el WhatsApp de Atlante con el resumen**. Hoy ninguna nave usa este modo, así que la ruta redirige (307) a la ficha; el 404 queda para los slugs que no existen. Texto: **"Te respondemos por WhatsApp"** — la promesa de "menos de 2 horas" no se publica (PENDIENTE MARK #6).
- **`/aliados`** (`+ PartnersPitch.tsx`) y **`/aliados/registro`** (`+ PartnerForm.tsx`): las tres propuestas (operadores de charter, hoteles y concierges, agencias y DMC), la línea "comisión según acuerdo" y el formulario que escribe en `PartnerApplication` vía `POST /api/partner-applications`. Sin base de datos responde `{ ok: true, saved: false }` y la pantalla ofrece cerrar por WhatsApp: no se pierde el aliado por una caída de Postgres.
- **Home**: `ChartersSection` muestra las tres naves con el precio por persona **para 15 personas** y el enlace a `/charters`.
- **Enlaces y SEO**: `/aliados` entra en el pie; `sitemap.ts` suma `/charters/[slug]`, `/charters/comparar`, `/aliados` y `/aliados/registro`; `robots.ts` bloquea además `/charters/*/listo` y `/cotizar`; `next.config.ts` cambia el 301 de `/compare` de `/charters` a **`/charters/comparar`**, que es lo que pide el PRD 5.1 y que hasta ahora no existía.

### 2.3 APIs y leads

- **`POST /api/leads`**: un cuerpo con `vessel` es un lead de nave; uno con `slug`, el de la ticketería de siempre. Ninguna respuesta cambia para el funnel del bloque 2.
- **`src/lib/vessel-leads.ts`** (nuevo): validación (nave activa, casilla marcada, WhatsApp E.164, nombre de dos palabras, correo, fecha no pasada con un día de holgura, jornada entre las publicadas, personas dentro de la capacidad, ocasión de la lista) y persistencia. **El tipo y el estado los decide el servidor a partir del `closeMode` de la nave**, no el cliente: `deeplink` → `charter_pex` en `created` con `Handoff` y `destinationUrl`; `quote` → `charter_partner` en `quote_requested`, sin handoff (no hay checkout que prellenar). Sin base de datos devuelve `leadId: null` y la URL sin `ref_id`.
- **`src/lib/destination.ts`**: nueva `vesselDestination(vessel, { leadId, handoffToken })` — checkout de chárter de PEX con `ref`, `ref_id`, `h` y UTM. Sin `pexVesselSlug` cae a la ficha de la nave y, si tampoco la hay, a la home de PEX: **nunca se pierde el `ref`**.
- **`POST /api/partner-applications`** + **`src/lib/partner-applications.ts`** (nuevos): validación, rate-limit propio de 5/min por IP (más estrecho que el de leads: un alta de aliado no se repite diez veces) y escritura con estado `new`.
- **`src/lib/analytics.ts`**: evento nuevo `quote_requested {vessel, pax, hours}` del PRD 5.12; en Meta se manda como `Lead`, igual que `lead_created`.
- **`src/lib/notify.ts`**: el aviso al concierge acepta los modos `charter` y `cotizacion`. Sigue sin llevar nombre, correo ni teléfono.

### 2.4 Admin (4.3)

- **`/admin/naves`**: lista con nave, operador, tipo, capacidad, **tramo más barato**, modo de cierre, fecha de verificación con aviso rojo a los 14 días y estado; acciones Editar / Eliminar; formulario de alta al final.
- **`/admin/naves/[slug]`**: edición completa. Los campos JSON se editan como texto — la tabla de precios con una fila por línea (`ruta | horas | capacidad | precio`), los extras bajo solicitud como `etiqueta ES | etiqueta EN | precio | unidad`, las rutas separadas por coma y las listas bilingües en dos textareas emparejadas por línea. Botón "Marcar verificada hoy".
- **`/admin/operadores`** y **`/admin/operadores/[slug]`**: CRUD con `commissionPct` **interno** y el checklist de verificación (licencia AMP, seguro vigente, contrato firmado) más la casilla `verified`. La lista dice, por operador, si el sello se está mostrando en público; la ficha lo explica cuando no. Un operador con naves no se puede borrar.
- **`/admin/aliados`**: las solicitudes de `/aliados/registro` con su tipo, contacto, embarcación, mensaje y estado (`new → reviewing → approved / rejected`), botón de WhatsApp y borrado. La pantalla avisa de que aprobar **no publica nada**: la ficha se crea a mano en `/admin/naves` con los datos verificados.
- **`/admin/leads`**: el filtro de producto incluye ahora las naves; la columna de producto muestra `nave: <slug>` y la ocasión; la de fecha de servicio muestra la jornada (`4 h`); y los leads de cotización tienen los botones **`quoted`** y **`accepted`** (`quote_requested → quoted → accepted`), además de "Marcar pagado" y "Perdido" de siempre. El CSV suma las columnas `horas` y `ocasion`.
- **Comisión de charter**: `markLeadPaidAction` y el webhook usan la comisión **del operador** cuando el lead tiene `vesselSlug`; si el operador no la fija, la del producto; si tampoco, `ATLANTE_COMMISSION_PCT`.
- **`src/lib/labels.ts`** (nuevo): un solo resolvedor `slug → nombre` para productos y naves, que usan `/admin/leads`, `/admin/comisiones` y su CSV.
- **`src/app/admin/vessel-actions.ts`** y **`src/lib/vessel-forms.ts`** (nuevos): las acciones con `requireAdmin()` y el parseo de los campos de texto, fuera de la página **porque una tabla de precios mal parseada se lleva por delante el precio por persona de todo el marketplace** (tiene 4 casos de prueba).
- Nav del admin: Resumen · Leads · Catálogo · **Naves · Operadores · Aliados** · Comisiones.

### 2.5 Accesibilidad y CSS

`src/app/globals.css` suma el bloque del marketplace (filtros, tarjetas, comparador, formularios de charter y de aliados, rejilla de `/aliados`), móvil primero: una columna hasta 900 px, controles de 48 px y tipografía ≥ 15 px en los formularios.

Además, Lighthouse destapó **cinco defectos de contraste** que rompían la regla 14 ("tipografía legible al sol"). Tres estaban en páginas de este bloque y dos venían del sistema de diseño de R0; se arreglaron los cinco porque el bloque los hereda:

| Elemento | Antes | Ahora |
|---|---|---|
| `.button-ghost` sobre marfil (filtros y "Ver todas las naves") | marfil sobre marfil, **1.07:1** — botón invisible | texto y borde en tinta |
| `.card-kind` en tarjeta clara (badge "Reserva directa") | dorado sobre blanco, 12 px, **2.12:1** | bronce oscuro, 13 px, 5.9:1 |
| `.charter-card.light-card .button-primary` | bronce sobre bronce, **1.58:1** | marfil sobre bronce oscuro |
| `.button-primary` (CTA principal de todo el sitio) | 3.41:1 con texto de 12 px | fondo `--bronze-dark`, 5.4:1 |
| `.fact` (dato corto en mayúsculas) | bronce a 12 px, 3.4:1 en claro y 3.6:1 en oscuro | 13 px, bronce oscuro sobre claro y dorado sobre oscuro |

Se añadió la variable `--bronze-dark: #8f5528` (el mismo tono, más oscuro), `aria-hidden` en la "A" de la marca y `.pex-inline-light` en vez del estilo en línea de `PexDisclosure`. **Es un cambio de sistema de diseño que afecta a todas las páginas**: si Mark prefiere el bronce claro, es revertir esas líneas de `globals.css` (ver PENDIENTE MARK #9).

---

## 3. Tests

`npm run test` pasó de 88 a **113 casos**. `tests/vessels.test.ts` (25 nuevos):

| Grupo | Qué asegura |
|---|---|
| Precio por persona (6) | **Aura · 15 pax · Bahía · 4 h = $1,300 / 15 = $86.67**; **Sirena del Mar · 80 pax · Las Perlas = $5,380 / 80 = $67.25**; manda el tramo que cubre al grupo (Sirena 20 pax Bahía = $1,950, no $1,300); **sin tramo publicado no se inventa un precio** (Aura a 35 pax → `null`); el tramo más barato de las tres es $1,300 · 4 h · ≤15; con el grupo por defecto (15) las tres dan $86.67 |
| Filtros y orden (7) | Capacidad mínima; presupuesto máximo contra los tramos publicados; la jornada de 12 h deja fuera al Aura; ruta, tipo y marina; una nave inactiva no se lista; los selectores se arman con los valores presentes; el orden por precio por persona manda y las naves sin precio van al final, con el `order` como desempate |
| Salida a PEX (3) | **Las tres URLs de "Reserva directa" llevan `ref=ATLANTE`**, `ref_id`, `h`, las UTM y `vessel`, y ninguna lleva `name`, `email`, `phone`, `nombre`, `correo` ni `telefono`; sin lead sigue llevando el `ref`; sin slug de checkout cae a la ficha **sin perder el `ref`** |
| Sello del operador (2) | Exige los tres del checklist más la casilla del admin; un seguro vencido lo apaga; **hoy ningún operador lo muestra** |
| Formularios del admin (4) | La tabla de precios va y vuelve sin perder nada; una fila incompleta se descarta en vez de guardarse a medias; las rutas se normalizan sin repetir; los extras conservan precio y unidad y admiten no tenerlos |
| Datos del bloque 2 (1) | Las tres naves, su operador, su fecha de verificación, su `sourceUrl`, su apartado del 30 %, su marina y sus capacidades (35 / 30 / 80) |

No hay test de `src/lib/vessel-leads.ts` ni de `partner-applications.ts`: son `server-only` (Prisma + `next/headers`) y el runner de Node no los puede cargar. Su camino se cubre con el humo del §7, que sí ejercita `POST /api/leads` y `POST /api/partner-applications` de punta a punta.

---

## 4. Qué no se hizo

- **No se ejecutó ninguna migración.** `0004_charters` está escrita y verificada contra el esquema, pero no se aplicó a ninguna base: no hay Postgres propio en esta máquina y la regla 1 prohíbe correrla contra la remota. `npm run db:seed` tampoco se corrió.
- **El camino con base de datos no se probó en vivo**, por lo mismo. Lo que sí está probado entero es el camino sin base de datos, que es el estado de hoy.
- **No hay naves ni operadores aliados.** El bloque lo dice explícitamente: sólo las tres de PEX. `closeMode: "quote"`, `/cotizar/[slug]` y `/admin/aliados` quedan listos y sin usar.
- **No hay fotos reales**: las tres naves usan `/og-atlante.jpg` como marcador, igual que el catálogo. El PRD pide un mínimo de 8 fotos por nave; PEX tiene 23 del Aura (PENDIENTE MARK #3).
- **No se tocó PEX** ni se implementó nada del anexo X1–X9.
- **No se instaló ninguna dependencia.** Lighthouse se corrió con `npx lighthouse` sin añadirlo al `package.json`.
- **Los charters no tienen calendario de disponibilidad.** El formulario pide una fecha deseada y PEX la confirma en su checkout; el feed X4 sólo cubre ticketería.
- **La ficha no publica métodos de pago ni contactos de PEX** (regla del bloque 2 que se mantiene).

---

## 5. Decisiones tomadas por ambigüedad (regla 12)

1. **El "desde $1,300" del Aura se cargó como Bahía y Puente · 4 h · hasta 15 pax.** PEX publica ese precio como "barco completo desde $1,300" sin decir el tramo, pero la prueba que exige el propio bloque 4.4 (*"Aura 15 pax Bahía 4 h = $1,300/15 = $86.67"*) lo fija, y coincide con el tramo equivalente del Pacific Ferry 1 y del Sirena del Mar. Los demás tramos del Aura (Bahía hasta 35, Las Perlas) **no se cargaron**: PEX no publica su precio.
2. **Tipo de nave.** `catamaran` para el Aura (PEX lo dice), `ferry` para el Pacific Ferry 1 (su propio nombre y la nave con la que PEX opera el Tour por la Bahía) y **`no_publicado`** para el Sirena del Mar, que se muestra como "Tipo no publicado". No se le puso un tipo a ojo (regla 3).
3. **`type` es una clave, no un texto.** Las etiquetas ES/EN viven en el diccionario de `i18n.ts` (`vessel_type_*`), como las rutas (`route_*`) y las ocasiones (`occasion_*`). Así el filtro compara claves y el idioma sigue el mecanismo del bloque 2 (regla 13).
4. **Se añadieron `summary`, `description` y `pexPricePerPersonFrom` al modelo `Vessel`.** El bloque da los campos como mínimos y la ficha necesitaba texto: los dos primeros son los que ya escribió el bloque 2 para los productos `charter_pex`, y el tercero es el "desde $55/persona" que PEX publica y que la ficha muestra como nota (explica por qué el calculado y el publicado no coinciden).
5. **Se añadieron `Lead.hours` y `Lead.occasion`.** El punto 4.3 pide que `/admin/leads` muestre "horas y pax" de los charters; sin columnas propias habría que esconderlos en un JSON. Son dos columnas nullable, aditivas.
6. **Se añadieron `PartnerApplication.kind` y `.message`.** `/aliados` tiene tres propuestas distintas y sin `kind` todas llegarían iguales al admin.
7. **Los productos `charter_pex` del catálogo se conservan.** Son la fuente de precio que compara `npm run check:pex` y la que edita `/admin/catalogo`; ninguna página los renderiza ya. La ficha pública de una nave sale sólo de `Vessel`. Es una duplicación consciente y anotada en `content/catalog.ts`: si se elimina, hay que rehacer `check:pex`.
8. **El sello "Operador verificado" exige los tres del checklist Y la casilla `verified`.** El bloque dice "sólo con los 3"; la casilla añade el poder de apagarlo a mano sin borrar los datos. Con el seguro vencido el sello se cae solo.
9. **`commissionPct` de PEX se dejó vacío**, para que la comisión salga de un único sitio (`ATLANTE_COMMISSION_PCT`, 20 %) hasta que Mark la confirme.
10. **El mensaje de WhatsApp de la cotización no lleva datos personales.** El bloque pide "abre WhatsApp de Atlante con el resumen"; la regla 7 prohíbe nombre, correo y teléfono en una URL. El mensaje lleva nave, fecha, jornada, personas, ocasión y el **id del lead**: la identidad la pone la propia cuenta de WhatsApp de quien escribe y el resto está en `/admin/leads`.
11. **`/cotizar/[slug]` con una nave `deeplink` redirige (307) a la ficha** en vez de dar 404: la intención es clara y el 404 sólo se reserva para los slugs que no existen.
12. **El grupo por defecto es 15 personas** en `/charters`, en el comparador y en la home. El bloque lo fija para la home y usar el mismo número en todas partes evita que el precio cambie al navegar.
13. **`people` no descarta naves en el listado**, sólo cambia el precio que se muestra: una nave sin tramo que cubra al grupo aparece con "Sin tarifa publicada para N personas: consúltanos". Para descartar por tamaño está el filtro "capacidad mínima", que el bloque pide aparte.
14. **Borrar una nave es un borrado real** (los leads guardan `vesselSlug` como texto y no se rompen); borrar un operador **sólo se permite si no tiene naves**, porque la relación es en cascada y se llevaría sus fichas por delante.
15. **`ListoScreen` se extrajo de `Listo.tsx`** en vez de duplicar la pantalla: el bloque pide "la misma pantalla `/listo` del bloque 2" y ahora es literalmente el mismo componente.
16. **Se arreglaron dos contrastes del sistema de diseño de R0** (`.button-primary` y `.fact`), no sólo los de este bloque. Son la regla 14, aparecen en las páginas nuevas y el arreglo es un tono más oscuro del mismo bronce (ver §2.5 y PENDIENTE MARK #9).
17. **`scripts/smoke-bloque4.mjs`** queda en el repo, como el del bloque 3: es el humo del §7 y no entra en `lint`, `build` ni `test`.

---

## 6. Lighthouse móvil

`npm run build` + `npx next start` + `npx lighthouse … --form-factor=mobile --screenEmulation.mobile` (Lighthouse 13.4.1, Chrome headless, throttling simulado):

| Ruta | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| **`/charters`** | **98** | **100** | **100** | **100** |
| `/charters/comparar?v=aura,sirena-del-mar` | 99 | 100 | 100 | 100 |
| `/charters/aura` | 86 | 100 | 100 | 100 |
| `/` | 87 | 100 | 100 | 100 |

El criterio del bloque (≥ 85 en `/charters`) se cumple con holgura, y de paso las otras tres rutas también. El 86–87 de la ficha y la home viene del hero a pantalla completa con la imagen de fondo, no de nada que añada este bloque.

Queda un aviso informativo de peso 0 (`label-content-name-mismatch`) en el logotipo del encabezado y del pie: el `aria-label` dice "Atlante del Pacifico" y el texto visible se concatena sin espacio ("Atlantedel Pacifico"). No afecta a la puntuación y viene de R0; no se tocó para no mover la marca.

---

## 7. Cómo probarlo

```bash
npm install
npm run lint     # eslint + check:pex-links
npm run test     # 113 casos
npm run build
npx prisma validate
```

### Humo sin base de datos (corrido en esta sesión)

Con `npm run build && npx next start -p 3011` y **sin `DATABASE_URL`**:

```bash
node scripts/smoke-bloque4.mjs http://localhost:3011
```

| Comprobación | Resultado |
|---|---|
| `/`, `/charters`, `/charters?people=80&hours=12&route=perlas`, las tres fichas, `/charters/comparar?v=…`, `/charters/aura/listo`, `/aliados`, `/aliados/registro`, `/sitemap.xml`, `/robots.txt` | **200** |
| `/compare` | **308 → `/charters/comparar`** |
| `/cotizar/aura` (nave con cierre directo) | **307 → `/charters/aura`** |
| `/charters/no-existe`, `/cotizar/no-existe` | **404** |
| `/admin/naves`, `/admin/naves/aura`, `/admin/operadores`, `/admin/operadores/pex`, `/admin/aliados` sin cookie | **307** al login |
| `POST /api/leads` con `vessel: "aura"`, 15 pax, 4 h | **200**, `destinationUrl` = `…/charter/checkout?vessel=aura&ref=ATLANTE&utm_source=atlante&utm_medium=referral&utm_campaign=aura`, `estimate: 1300`, `closeMode: "deeplink"` — sin `ref_id` porque no hay base de datos |
| … sin la casilla de autorización | **400** `accepted` |
| … con 200 personas (capacidad 35) | **400** `pax` |
| … con jornada de 12 h (el Aura no la publica) | **400** `hours` |
| … con una nave inexistente | **400** `vessel` |
| `POST /api/partner-applications` válido | **200** `{"ok":true,"saved":false}` (sin DB) |
| … con WhatsApp inválido / nombre de una letra | **400** `whatsapp` / `name` |
| `/charters` publica "$86.67" por persona y el badge "Reserva directa" | sí |
| "Operador verificado" **no** aparece en `/charters` | correcto: PEX no tiene el checklist cargado |
| La home publica el precio por persona para 15 pax | sí |
| La ficha del Sirena publica el tramo de $5,380 | sí |
| La ficha **no** trae el WhatsApp de PEX | correcto |
| El sitemap incluye las tres fichas de nave | sí |
| `robots.txt` bloquea `/cotizar` y `/charters/*/listo` | sí |

### Verificación de la regla 15

| Búsqueda en `src/` | Resultado |
|---|---|
| `atlantedelpacifico.com`, `ATLANTE10`, `Pocos cupos`, `127 rese`, `aggregateRating`, `sunset` (sin distinguir mayúsculas) | **0** |
| `stripe / paguelo / yappy / card_number` | **0** |
| `850 / 1450 / 2800 / 1800 / 3200` como precio | **0** |
| `1200` | sólo el ancho de la imagen OG en `layout.tsx` y en la ficha de producto, igual que en los bloques 2 y 3 |
| `pacificexperience.lat` fuera de `lib/pex.ts`, `content/catalog.ts` y `content/vessels.ts` | **0** (`npm run check:pex-links`) |

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

1. **Marketplace desde la base**: `/admin/naves` debe listar las tres naves y `/admin/operadores` el operador `pex`; las dos pantallas deben decir "fuente del marketplace: base de datos".
2. **Edición**: cambiar en `/admin/naves/aura` la fila `bahia | 4 | 15 | 1300` a `1400` y comprobar que `/charters`, la ficha y el comparador pasan a $93.33 por persona **sin desplegar**.
3. **Sello**: cargar en `/admin/operadores/pex` licencia AMP, un seguro con fecha futura y un contrato, marcar "verificado" y comprobar que el sello **aparece** en `/charters` y en las tres fichas; poner el seguro en una fecha pasada y comprobar que **desaparece**.
4. **Lead de charter con base de datos**: completar el formulario del Aura y verificar que el `destinationUrl` trae **`ref_id=<cuid>`** y **`h=<64 hex>`**, que el lead queda como `charter_pex` / `created` con `hours`, `occasion` y `paxTotal`, y que aparece en `/admin/leads` con "nave: aura" y "jornada: 4 h".
5. **Cotización**: poner una nave en `closeMode: "quote"` desde el admin, entrar a `/cotizar/<slug>`, enviar el formulario y comprobar que el lead queda `charter_partner` / `quote_requested`, que el enlace de WhatsApp **no lleva nombre ni teléfono**, y que en `/admin/leads` los botones llevan `quoted` → `accepted`.
6. **Comisión del operador**: fijar `commissionPct = 15` en el operador y marcar pagado un lead de charter: la comisión tiene que salir al 15 %, no al 20 %.
7. **Alta de aliado**: enviar `/aliados/registro` y comprobar que aparece en `/admin/aliados` con estado `new`, que los botones lo llevan a `reviewing` y `approved`, y que se puede borrar.
8. **Borrado**: un operador con naves no se puede borrar; borrar una nave no rompe los leads que la referencian (siguen mostrando su slug).

---

## 8. PENDIENTE MARK

| # | Tema | Detalle y qué hay que decidir |
|---|---|---|
| 1 | **Comisión con operadores aliados** | `/aliados` dice "comisión según acuerdo" porque no hay número decidido (decisión #2 del PRD). Se fija por operador en `/admin/operadores`; sin valor manda `ATLANTE_COMMISSION_PCT` (20 %). |
| 2 | **Comisión con Pacific Experience** | El operador `pex` se sembró **sin** `commissionPct`, así que hoy toda la comisión sale del 20 % global. Confirmar el número y si es el mismo para tours, ferry y charters. |
| 3 | **Fotos reales de las naves** | Las tres usan `/og-atlante.jpg`. El PRD pide un mínimo de 8 por nave y PEX tiene 23 del Aura (mismo dueño). Se cargan desde `/admin/naves/[slug]` (una ruta por línea) en cuanto los archivos estén en `public/`. |
| 4 | **Tipo del Sirena del Mar** | PEX no lo publica: la ficha dice "Tipo no publicado" y el filtro lo ofrece así. Una palabra lo arregla en el admin. |
| 5 | **Eslora de las tres naves** | NO ENCONTRADA en PEX. El campo existe (`lengthFt`) y está vacío; no se muestra nada. |
| 6 | **Tiempo de respuesta de la cotización** | El texto publicado es **"Te respondemos por WhatsApp"**. La frase "en menos de 2 horas en horario de atención" **no se publica** hasta que exista un horario de atención confirmado (decisión #12 del PRD). Es una clave de `i18n.ts` (`quote_reply`). |
| 7 | **Tramos de precio que PEX no publica** | Del Aura faltan Bahía hasta 35 pax y Las Perlas (la capacidad sí está publicada: 35 y 15). Mientras falten, un grupo de 35 personas ve "Sin tarifa publicada para 35 personas: consúltanos" en vez de un precio inventado. |
| 8 | **Checklist de verificación de PEX** | El operador `pex` no tiene licencia AMP, seguro ni contrato cargados, así que **el sello "Operador verificado" no se muestra en ninguna parte**. Cargarlos en `/admin/operadores/pex` y marcar la casilla lo enciende. |
| 9 | **Cambio de color del CTA principal** | El botón primario pasó de `#b8733a` a `#8f5528` (mismo tono, más oscuro) porque a 12 px en mayúsculas el anterior daba 3.4:1 y la regla 14 pide texto legible al sol. Afecta a **todas** las páginas. Si prefieres el bronce claro, es cambiar `--bronze-dark` por `--bronze` en `.button-primary` y `.fact` de `src/app/globals.css`. |
| 10 | **Aplicar las migraciones** | `0001_init`, `0002_broker_v2`, `0003_catalog` y ahora `0004_charters` están escritas y **no ejecutadas**. `0004` es puramente aditivo. Antes de `prisma migrate deploy` hay que restaurar el proyecto Supabase "ATLANTE". |
| 11 | **Sembrar el marketplace** | Después de migrar, `npm run db:seed` copia el operador y las tres naves a `Operator`/`Vessel` (además del catálogo). Es idempotente. **Hasta que se corra, `/admin/naves` y `/admin/operadores` no pueden editar nada** (el sitio se sirve del respaldo en código). |
| 12 | **Contrato tipo y kit de operador** | El bloque no los incluye (son T55 del TODO, de Mark/legal). `/aliados/registro` ya recoge las solicitudes; lo que falta es el documento que se les manda. |
