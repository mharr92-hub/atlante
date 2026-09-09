# Bloque 6 — R4 · Crecimiento: destinos, EN completo, CI

Fecha: 2026-09-09 · Rama: `feature/atlante-broker` · Sin push, sin merge, sin deploy, sin tocar Vercel ni Supabase, sin ejecutar migraciones contra ninguna base de datos.

**Estado del bloque: el sitio entero existe ahora en dos idiomas con URLs propias (`/tours` y `/en/tours`), hay tres páginas de destino que juntan todas las formas de llegar a Taboga, Las Perlas y la Bahía, y cada push a la rama pasa por lint, tests, build y un e2e que comprueba que el funnel sigue saliendo a Pacific Experience con `ref=ATLANTE`.** No se inventó ningún dato de ningún lugar: el texto de los tres destinos no contiene ni una cifra, y hay un test que lo verifica.

Commits del bloque (sobre `a7509df`):

| SHA | Sub-bloque |
|---|---|
| `b4772e6` | Páginas de destino, enlace desde la home y el pie, sitemap y tests (6.1) |
| `0fd9ea6` | Rutas `/en/*`, `hreflang`, metadata por idioma y selector del header (6.2) |
| `a548eb3` | CI en GitHub Actions, e2e de Playwright y Lighthouse no bloqueante (6.3) |
| `5377292` | Verificación móvil a 390 px y controles a 44 px (6.4) |
| (este) | Reporte |

| Comprobación | Resultado |
|---|---|
| `npm run lint` | limpio (eslint + `check:pex-links`) |
| `npm run test` | **156/156** (134 antes del bloque) |
| `npm run test:e2e` | **2/2** (nuevo) |
| `npm run build` | ✓ compila, **40 rutas** (39 del bloque 5 + `/destinos/[slug]`) |
| `npx tsc --noEmit` | limpio |
| Humo sin base de datos (`scripts/smoke-bloque6.mjs`) | ✓ **todo OK** (§7) |
| Móvil 390 px (`scripts/movil-390.mjs`) | ✓ sin scroll horizontal, sin controles bajo 44 px (§6) |

---

## 1. Variables de entorno y dependencias

**Ninguna variable nueva.** `.env.example` queda igual. El CI corre **sin `DATABASE_URL` a propósito**: la regla 9 dice que todo tiene que compilar y funcionar sin base de datos, así que la corrida de CI es también la prueba de esa regla. Si algún día el build la exigiera, el sitio para la ficticia está señalado con un comentario en `ci.yml`.

**Una dependencia nueva, de desarrollo y gratuita:**

| Paquete | Por qué |
|---|---|
| `@playwright/test` (devDependency) | Lo pide el bloque 6.3 explícitamente ("Playwright e2e mínimo del funnel"). Es MIT, no tiene servicio de pago detrás y sólo se instala en desarrollo y en CI. En CI se descarga **sólo Chromium** (`npx playwright install --with-deps chromium`), no los tres navegadores. |

`@lhci/cli` **no** se añadió a `package.json`: se invoca con `npx --yes @lhci/cli@0.15.x` en el job de Lighthouse, que es opcional y no bloqueante. Así el `npm ci` del job principal no carga con él.

---

## 2. Qué se hizo, por archivo

### 2.1 Páginas de destino (6.1)

- **`src/content/destinations.ts`** (nuevo): los tres destinos con nombre, título, resumen y **tres párrafos en ES y EN cada uno**. La regla del archivo, escrita en su cabecera y verificada por un test: **aquí no hay ni un número**. Ni distancias, ni tiempos de travesía, ni temporadas, ni capacidades. Los únicos números que aparecen en la página son los que ya viven en el repo con su `verifiedAt`: los precios del catálogo y de las naves.
  - Cada destino declara `products` (slugs del catálogo que llegan ahí) y `route` (la clave de ruta de las naves: `taboga`, `perlas`, `bahia`).
- **`src/lib/destinations.ts`** (nuevo, puro): `productsForDestination()` separa lo que el operador **está vendiendo** de lo que no, y `vesselsForDestination()` cruza la ruta con `Vessel.routes`. Sin Prisma y sin `server-only`, así que los prueban los tests.
- **`src/app/(site)/destinos/[slug]/page.tsx`** (nuevo): resuelve el destino, pide catálogo y naves (base de datos si la hay, respaldo en código si no), calcula el sello del operador igual que `/charters` y emite **JSON-LD `TouristDestination` sin `aggregateRating`** (regla 3 y PRD 5.11). Un slug que no existe da 404.
- **`src/components/destinations/DestinationDetail.tsx`** (nuevo): el texto del lugar y debajo las secciones "En ticket, por persona" y "En nave completa, para tu grupo", con **las mismas tarjetas de `/tours` y `/charters`** (`ProductCard` y `VesselCard`). Eso significa que el precio y el CTA salen de la misma fuente verificada: esta pantalla no calcula ni un dólar por su cuenta. El CTA de un ticket entra a `/reservar/[slug]` y el de una nave a `/charters/[slug]`, como pide el bloque.
  - Los productos que el operador no está vendiendo salen en una tercera sección, **sólo con el nombre, sin precio y sin botón**, con la explicación de por qué. Es lo honesto: existen, pero hoy no se pueden reservar.
- **`src/components/sections/Destinations.tsx`**: la sección de la home ahora lee `content/destinations.ts` y cada destino enlaza a su página. **De paso desaparecen tres cifras que nadie podía respaldar** y que venían del repo original: "A 12 millas nauticas de Amador" y "Tres horas costeando el skyline" (§5.2).
- **`src/components/site/Footer.tsx`**: cuarta columna con los tres destinos, además de la navegación y los legales.
- **`src/app/sitemap.ts`**: las tres rutas nuevas, con prioridad 0.7.
- **`src/app/globals.css`**: `.destination-copy`, `.destination-pending`, el enlace del título en `.destination-list` y la cuarta columna del pie (`1fr auto auto auto`, que en móvil sigue colapsando a una).
- **`src/lib/i18n.ts`**: `destinos_lede`, `dest_see`, `dest_tickets_title`, `dest_charters_title`, `dest_unavailable_title`, `dest_unavailable_note` y `dest_empty`, las siete en ES y EN.

Qué lista cada destino hoy, con el catálogo actual:

| Destino | En ticket | En nave completa | Publicado pero sin venta |
|---|---|---|---|
| `/destinos/taboga` | — | Aura, Pacific Ferry 1, Sirena del Mar | Ferry a Isla Taboga |
| `/destinos/las-perlas` | — | Aura, Pacific Ferry 1, Sirena del Mar | Ferry a Contadora |
| `/destinos/bahia` | Tour por la Bahía, Party en la Bahía | Aura, Pacific Ferry 1, Sirena del Mar | — |

Que Taboga y Las Perlas no tengan ticket **no es un hueco de la página**: es el estado real del catálogo (los dos ferrys están `available: false` desde el bloque 2, decisión #8 del PRD). En cuanto Mark active el ferry de Taboga en `/admin/catalogo`, aparece solo en su destino, con precio y con CTA.

### 2.2 Inglés completo y `hreflang` (6.2)

**La decisión de diseño, que es lo que hay que revisar:** rutas `/en/*` **reescritas en el proxy**, no un segmento `[locale]`.

- `/en/tours` se reescribe a `/tours` y el idioma viaja al servidor en la cabecera `x-atlante-locale`. La barra de direcciones sigue mostrando `/en/tours`, así que la URL en inglés se puede compartir, indexar y declarar en `hreflang`.
- Es la opción más simple compatible con Next.js 16 y la que menos mueve el árbol de `app/`: un segmento `[locale]` habría obligado a mover las 20 rutas públicas —y el admin, que no se traduce— dentro de una carpeta nueva, con `generateStaticParams` en todas.
- Consecuencia deliberada: **la URL manda**. `/tours` es siempre español y `/en/tours` siempre inglés, para cualquiera que entre, persona o robot. Por eso **la cookie `locale` de los bloques 0 a 5 desaparece**: no puede haber contradicción entre lo que dice la URL y lo que se ve.

Archivos:

- **`src/lib/locale-routing.ts`** (nuevo, puro): la única pieza que decide qué URL corresponde a qué idioma. `splitLocalePath()`, `localePath()`, `localeHref()` (respeta query y ancla, ignora lo externo), `localeUrl()`, `languageAlternates()` y `alternatesFor()`. La comparten el proxy (edge), el servidor, el cliente y los tests.
- **`src/lib/locale-server.ts`** (nuevo, `server-only`): `getLocale()` lee la cabecera del proxy y cae al español si no está; `pageAlternates()` arma el bloque `alternates` de la metadata; `localeRedirect()` mantiene el idioma en un `redirect()` de servidor.
- **`src/proxy.ts`**: además de la atribución del bloque 5, reescribe `/en/*` y pone las cabeceras `x-atlante-locale` y `x-atlante-path`. **La limpieza del código de aliado conserva el prefijo**: `/en/tours?partner=HOTELX` sale a `/en/tours`, no al español.
- **`src/app/layout.tsx`**: `metadata` pasa a ser `generateMetadata()`, porque el título, la descripción, el `openGraph.locale` y el canonical cambian con el idioma. `<html lang>` sale del idioma de la URL.
- **`src/lib/locale-context.tsx`**: el contexto se queda sólo con `locale`. Sin setter y sin cookie: cambiar de idioma es navegar.
- **`src/components/site/LocaleLink.tsx`** (nuevo): un `next/link` que antepone `/en` a cualquier `href` interno cuando la página está en inglés. **Los 17 componentes públicos importan este archivo en lugar de `next/link`**, así que una vez dentro de `/en/*` ningún clic devuelve al visitante al español sin querer. El admin sigue con `next/link`: no se traduce.
- **`src/components/site/Header.tsx`**: el selector ES/EN son **dos enlaces a la misma página en el otro idioma**, construidos con `splitLocalePath(usePathname())`. Se usa `<a>` y no `next/link` a propósito: cambiar de idioma recarga la página entera, que es lo que garantiza que el `lang` del documento y todo el texto queden en el idioma nuevo.
- **`src/components/funnel/Funnel.tsx`** y **`src/components/charters/CharterForm.tsx`**: los `router.push()` hacia `/listo` pasan por `localeHref()`.
- **Metadata por página**: `/tours`, `/tours/[slug]`, `/charters`, `/charters/[slug]`, `/charters/comparar`, `/destinos/[slug]`, `/reservar/[slug]`, `/aliados`, `/aliados/registro`, `/como-funciona`, `/terminos`, `/privacidad` y `/cancelaciones` pasan de `metadata` estática a `generateMetadata()` con título y descripción del diccionario y `alternates` autorreferentes. Las tres pantallas de tránsito (`/reservar/*/listo`, `/charters/*/listo`, `/cotizar/*`) llevan `alternates: { canonical: null }`: lo que no se indexa no declara `hreflang` ni hereda el canonical de la home (que es lo que hacían antes).
- **`src/app/sitemap.ts`**: una entrada por página con `alternates.languages` (`es`, `en`, `x-default`), que es la forma que recomienda Google, en lugar de duplicar las URLs.
- **`next.config.ts`**: las cuatro 301 de R0 se duplican con prefijo `/en`, para que `/en/compare` salga a `/en/charters/comparar` y no al español.
- **`src/config/site.ts`**: `description`, `titleSuffix` y el saludo por defecto de WhatsApp pasan a `{ es, en }`; aparece `whatsappGreeting(locale)`.
- **`src/lib/i18n.ts`**: 22 claves nuevas de metadata (`meta_*`) y las nueve que faltaban de chrome (`nav_main`, `nav_footer`, `nav_legal`, `nav_language`, `hero_media_alt`, `footer_tagline`, `footer_rights`, `contact_message_placeholder`, `contact_group_placeholder`).

**Auditoría del inglés.** Lo que faltaba traducir era poco, porque los bloques anteriores ya trabajaban con objetos `{ es, en }`. Lo que se encontró y se arregló:

| Dónde estaba en español | Ahora |
|---|---|
| Título y descripción de las 13 páginas públicas | Diccionario `meta_*` |
| `site.description` y el `titleSuffix` del título raíz | `{ es, en }` |
| Saludo por defecto de WhatsApp (flotante, contacto, términos, privacidad) | `whatsappGreeting(locale)` |
| `aria-label` de la imagen del hero, del menú principal, del pie, del bloque legal y del selector de idioma | Diccionario |
| Marcadores de posición del formulario de contacto ("Taboga, Las Perlas, atardecer…", "8 invitados, celebración") | Diccionario |
| Frases sueltas del pie ("Experiencias privadas en el océano", "Todos los derechos reservados") | Diccionario |

El humo comprueba que el inglés **se ve de verdad** y no es el español con otra URL: busca cadenas concretas en `/en/tours`, `/en/charters`, `/en/destinos/bahia`, `/en/como-funciona`, `/en/terminos` y `/en/reservar/tour-bahia` (§7).

`grep -ri sunset src/` sigue devolviendo **0**.

### 2.3 CI (6.3)

- **`.github/workflows/ci.yml`** (nuevo). Se dispara en cada push a `feature/**` y en cada PR contra `main`. Dos jobs:

  | Job | Pasos | Bloquea |
  |---|---|---|
  | `verificar` | `npm ci` → `npm run lint` → `npm run check:pex-links` → `npm run test` → `npm run build` → Chromium → `npm run test:e2e`; si falla, sube el informe de Playwright como artefacto | **Sí** |
  | `lighthouse` | `npm ci` → `npm run build` → `npx @lhci/cli autorun`; sube el informe como artefacto siempre | **No** (`continue-on-error: true`) |

  `check:pex-links` ya va dentro de `npm run lint`; se repite suelto para que el criterio A3 del PRD tenga su propio paso visible en el log. `concurrency` cancela la corrida anterior de la misma rama. `permissions: contents: read`: el workflow no puede escribir en el repo.

- **`playwright.config.ts`** (nuevo): un solo navegador (Chromium) y un solo viewport, **390 px**, que es el que fija la regla 14. Arranca `next start` él mismo (`webServer`), reutiliza el servidor si ya hay uno levantado en local y en CI no.
- **`e2e/funnel-tour-bahia.spec.ts`** (nuevo, 2 pruebas):
  1. **El camino que da de comer**: `/reservar/tour-bahia` → elegir fecha → horario → pasajeros → nombre, WhatsApp, correo y casilla → `/reservar/tour-bahia/listo` → botón "Ir ahora" → **la URL de salida contiene `ref=ATLANTE` y `utm_source=atlante`, y no contiene ningún dato personal**. Es el criterio A4 del PRD, y como corre sin `DATABASE_URL` es también el A5.
  2. **Entrada directa a `/listo`** (recarga o pestaña nueva, sin `sessionStorage`): el destino de respaldo **sigue llevando `ref=ATLANTE`**.
  - La salida a Pacific Experience **se intercepta con `page.route`**: la prueba comprueba a qué URL iba el navegador sin pedirle nada al sitio del operador. En CI no se hace ni una petición a pacificexperience.lat.
- **`lighthouserc.json`** (nuevo): las tres rutas del criterio A9 (`/`, `/reservar/tour-bahia`, `/charters`) con umbral **0.85 en rendimiento y accesibilidad** (error) y 0.9 en SEO y buenas prácticas (aviso). El preset por defecto de Lighthouse ya es móvil. El informe se guarda en el sistema de archivos (`.lighthouseci/`) y sube como artefacto de GitHub: **no se manda a ningún servicio externo**.
- **`package.json`**: script `test:e2e`.
- **`.gitignore`**: artefactos de Playwright y de Lighthouse.

### 2.4 Verificación móvil (6.4)

- **`scripts/movil-390.mjs`** (nuevo): no es una captura, es la medición que hay detrás de una captura. Abre las diez rutas clave en Chromium a 390 px y mide el ancho real del documento, el tamaño de letra más pequeño que se ve y el control más bajo. Fuera de `lint`, `build`, `test` y del CI, como los humos de los bloques 3, 4 y 5.
- **`src/app/globals.css`**: tres arreglos de la regla 14 que salieron de esa medición y que afectaban a todo el sitio, no sólo a lo de este bloque (§6).
- **`scripts/smoke-bloque6.mjs`** (nuevo): el humo del §7.

---

## 3. Tests

`npm run test` pasó de 134 a **156 casos**, más 2 de Playwright.

**`tests/destinos.test.ts`** (12 casos):

| Grupo | Qué asegura |
|---|---|
| Contenido | Los tres destinos existen con slug único; cada uno trae nombre, título, resumen y **2–3 párrafos** en los dos idiomas |
| **Regla 3** | **El texto de los destinos no contiene ningún dígito**, en ninguno de los dos idiomas: si alguien escribe "a 12 millas" el test falla |
| Coherencia | Todos los slugs de producto declarados existen en el catálogo; todas las rutas declaradas las publica alguna nave |
| Cruce | Bahía lista el tour y el party (los dos disponibles); Taboga y Las Perlas separan su ferry como "no se vende hoy", así que **no sale con precio**; las tres naves aparecen en los tres destinos |
| Degradación | Una nave apagada desaparece; un slug de producto que ya no existe se ignora sin romper la página; un destino sin nada publicado devuelve listas vacías, no un hueco |

**`tests/locale-routing.test.ts`** (10 casos):

| Grupo | Qué asegura |
|---|---|
| Prefijo | `/tours` en español y `/en/tours` en inglés; la raíz en inglés es `/en`, no `/en/` |
| Parseo | `/en/tours`, `/en`, `/en/`, `/tours` y `/` se parten bien; **`/english` y `/entradas` siguen en español** (no basta con empezar por "en") |
| Idempotencia | Aplicar el idioma dos veces no duplica el prefijo |
| `href` | Query y ancla se conservan (`?v=aura`, `#destinos`); lo externo (`https://`, `mailto:`, `#ancla`, `//host`) no se toca |
| SEO | Cada página declara `es`, `en` y `x-default` (español); **el canonical es autorreferente** y las alternativas son idénticas en las dos versiones |

---

## 4. Qué no se hizo

- **No se ejecutó ninguna migración ni se tocó el esquema.** El bloque 6 no añade ni una columna: los destinos son contenido en código y el idioma es enrutado. `0001`–`0005` siguen escritas y sin aplicar (PENDIENTE MARK #6).
- **No se añadió un campo `destinos` a `Product`.** El cruce destino → productos es una lista de slugs en `content/destinations.ts`, no una columna. Un campo en la tabla habría sido una migración (§5.1).
- **No hay `/destinos` (el índice).** El bloque pide las tres páginas de destino, no una portada que las liste. La entrada a los tres es la sección de la home y el pie.
- **No hay guías comparativas ni `/blog`.** Es la tarea T59 del TODO (R4), no está en este bloque.
- **No se tocó PEX** ni se implementó nada del anexo X1–X9.
- **No se corrió Lighthouse hasta el final en local.** Se intentó: arranca, audita las tres rutas y **revienta al limpiar su carpeta temporal en Windows** (`EPERM ... \\?\C:\Users\...\Temp\lighthouse.16764021`, dentro de `chrome-launcher`). Es un problema del entorno, no de la configuración: en el runner de Linux del CI no ocurre. Por eso **no hay una puntuación de Lighthouse que reportar** y por eso el job es no bloqueante desde el primer día, como permite el bloque.
- **No se traduce el admin**, por diseño y porque el bloque lo dice ("admin no"). `/en/admin` se reescribe a `/admin` y redirige al login igual que siempre; queda fuera del índice por el `robots` de siempre.
- **No se detectan el idioma del navegador ni la ubicación.** Quien entra a `/` ve español. Es lo más simple y lo más predecible: una redirección automática por `Accept-Language` habría convertido cada URL compartida en una lotería y complica el rastreo (§5.6).
- **No se arregló la tipografía de 10–12 px** del sistema de diseño (§6). Es anterior a este bloque, afecta a todo el sitio y es una decisión de marca, no un bug: va a PENDIENTE MARK.
- **El funnel no tiene `<h1>`** (usa `<h2>` desde el bloque 2). Salió en la medición del §6; no se cambió porque no es de este bloque y toca la jerarquía de la pantalla que más conversión mueve.

---

## 5. Decisiones tomadas por ambigüedad (regla 12)

1. **Prefijo `/en` reescrito en el proxy, no segmento `[locale]`.** El bloque deja elegir "la opción más simple compatible con Next.js 16"; ésta no mueve ni un archivo de `app/` y deja el admin fuera. Documentada en la cabecera de `src/lib/locale-routing.ts` y en §2.2.
2. **La URL manda sobre la cookie, y la cookie `locale` desaparece.** Con las dos conviviendo, `/tours` podía renderizar en inglés para quien tuviera la cookie puesta: dos idiomas en la misma URL canónica es exactamente lo que el `hreflang` viene a evitar.
3. **El selector de idioma recarga la página** (`<a>`, no `next/link`). Con una reescritura, `/tours` y `/en/tours` comparten árbol de rutas y el router de Next podría reutilizar el layout raíz sin volver a resolver el idioma. Una recarga es correcta por construcción y es lo que hace todo el mundo al cambiar de idioma.
4. **El selector conserva la ruta pero no la query.** Cambiar de idioma en `/charters?people=20` lleva a `/en/charters`. Leer la query en el header obligaría a `useSearchParams()` en el layout de todo el sitio; el precio no compensa.
5. **`x-default` apunta al español.** Es el idioma por defecto del sitio y del mercado (Panamá).
6. **Nadie se redirige por `Accept-Language`.** Quien entra a `/` ve español y tiene el selector a un clic. Ver §4.
7. **Las pantallas de tránsito no declaran `hreflang` ni canonical.** Antes heredaban el canonical de la home, que era peor: decían ser la portada.
8. **El texto de los destinos no lleva ni un número, y hay un test que lo impone.** El bloque dice "sin cifras, distancias ni tiempos que no estén ya en el repo". La regla más simple de sostener no es "sólo cifras del repo" sino "ninguna cifra en la prosa": los números que la página enseña son los de las tarjetas, que vienen del catálogo verificado.
9. **Los productos que el operador no vende salen nombrados, sin precio y sin CTA.** "Todas las formas de ir" incluye saber que el ferry a Taboga existe y hoy no se vende; enseñarlo con precio y botón sería vender algo que no se puede comprar.
10. **El cruce destino → productos es una lista de slugs en el contenido.** Ver §4. Si mañana Mark da de alta un producto nuevo en `/admin/catalogo` que llegue a Taboga, **no aparece solo en el destino**: hay que añadir su slug a `content/destinations.ts`. Es la única pieza de este bloque que no se mantiene sola, y está anotada en PENDIENTE MARK.
11. **El cruce destino → naves sí es automático**, porque `Vessel.routes` ya existe: una nave aliada nueva con la ruta `taboga` aparece en Taboga sin tocar código.
12. **Se quitaron las tres cifras inventadas de la sección de destinos de la home** ("12 millas nauticas", "Tres horas"). Venían del repo original, no las pedía este bloque, pero el bloque me hacía tocar ese archivo y la regla 3 no distingue entre texto viejo y texto nuevo.
13. **Un solo navegador y un solo viewport en el e2e.** Chromium a 390 px. El bloque pide un e2e "mínimo"; tres navegadores triplican la descarga en CI sin cubrir un riesgo real del funnel.
14. **La salida a PEX se intercepta en el e2e.** Comprobar la URL sin llamar al sitio del operador: el CI no debe generar tráfico ni ruido de analítica en pacificexperience.lat.
15. **Lighthouse guarda el informe en el sistema de archivos**, no en `temporary-public-storage`. El destino por defecto de `@lhci/cli` publica el informe en una URL pública de terceros; no hace falta y no es nuestro para publicarlo.
16. **El CI corre sin `DATABASE_URL`.** El bloque lo permite ("con `DATABASE_URL` ficticia si el build lo exige") y hoy no lo exige. Además, así cada corrida verifica la regla 9.
17. **Los tres arreglos de 44 px son de CSS y no cambian ningún texto ni ningún tamaño de letra.** Ver §6.

---

## 6. Móvil a 390 px (6.4)

`node scripts/movil-390.mjs http://localhost:3021`, con el build de producción y **sin base de datos**:

```
ruta                     ancho        letra mín   toque mín   h1
/                        390/390      10px        44px        El Pacifico panameno, bien conectado.
/destinos/taboga         390/390      11px        44px        Taboga: todas las formas de ir
/destinos/las-perlas     390/390      11px        44px        Las Perlas: todas las formas de ir
/destinos/bahia          390/390      10px        44px        Bahía de Panamá: todas las formas de ir
/tours                   390/390      10px        44px        Bahía, party e isla.
/charters                390/390      11px        44px        Renta total de la nave.
/reservar/tour-bahia     390/390      11px        44px        —
/en                      390/390      10px        44px        The Panamanian Pacific, well connected.
/en/destinos/bahia       390/390      10px        44px        Bay of Panama: every way to sail it
/en/charters             390/390      11px        44px        Whole-vessel rental.

Sin scroll horizontal y sin controles por debajo de 44 px.
```

### Las tres rutas clave, descritas

**`/destinos/bahia` a 390 px** — arranca con la franja de "Agente autorizado de Pacific Experience"; luego el bloque de texto: eyebrow "Destinos", `<h1>` "Bahía de Panamá: todas las formas de ir", el resumen y los tres párrafos a 18 px con interlineado 1.6, en una columna de ancho completo. Debajo, sobre fondo marfil, "En ticket, por persona" con las dos tarjetas del tour y del party, una encima de otra, cada una con su foto, la etiqueta de tipo, el precio real ("desde $25 por persona"), la duración, los días de salida, el resumen y dos acciones: "Ver detalle" y el botón "Reservar". Después, "En nave completa, para tu grupo" con las tres naves apiladas, cada una con "desde $1,300 (4 h · hasta 15 pax)" y el precio por persona calculado para 15. Cierra el pie con cuatro bloques apilados: marca, navegación, destinos y legales. Ningún elemento se sale de los 390 px.

**`/destinos/taboga` a 390 px** — misma estructura, pero sin la sección de tickets: empieza por las tres naves y termina con la sección marfil "Publicado, sin venta hoy", que dice "Pacific Experience no lo está vendiendo por ahora, así que no mostramos precio ni botón" y debajo, en una lista, "Ferry a Isla Taboga" — sin cifra y sin botón.

**`/en/charters` a 390 px** — el marketplace completo en inglés desde el `<html lang="en">`: `<h1>` "Whole-vessel rental.", los filtros ("How many people?", "Minimum capacity", "Maximum budget per boat", "Duration", "Route", "Vessel type", "Departure marina", "Clear filters") y las tres naves con "from $1,300 (4 h · up to 15 pax)" y "from $86.67 per person · for 15 people". El selector del header muestra EN activo y el enlace ES apunta a `/charters`. Todos los enlaces internos de la página empiezan por `/en/`.

### Los tres arreglos que salió de medir

| Selector | Antes | Ahora | Por qué |
|---|---|---|---|
| `.card-link` ("Ver detalle" / "See the destination") | 18 px de alto | `min-height: 44px` + centrado | Es el enlace de acción de cada tarjeta y queda a la altura del botón que lleva al lado |
| `.nav a`, `.site-footer nav a` | 18 px | `min-height: 44px` + centrado | El menú del header se oculta bajo 900 px: **el del pie es la navegación real en móvil** |
| `summary` (las preguntas de la FAQ) | 33 px | `min-height: 44px` + 7 px de relleno | Es el control que abre la respuesta. Se hizo con relleno y **no** con `display: flex`, que en Chromium se lleva por delante el triangulito de abrir y cerrar |

Ninguno cambia un texto, un color ni un tamaño de letra.

### Lo que la medición encontró y **no** se arregló

- **Letra de 10 a 12 px** en las etiquetas en versalitas del sistema de diseño: el "del Pacifico" de la marca, las insignias ("Atardecer" / "Evening"), la etiqueta de tipo de cada tarjeta y los enlaces del pie. Son **13 declaraciones en `globals.css`** (líneas 99, 139, 175, 437, 461, 629, 636, 867, 1004, 1022, 1044, 1071 y 1539), todas anteriores a este bloque. Subirlas a 13 px es media hora, pero cambia la identidad visual de todo el sitio y eso no lo decide una sesión de código sin poder verlo. → PENDIENTE MARK #5.
- **`/reservar/tour-bahia` no tiene `<h1>`**: la cabecera del funnel es un `<h2>`. → PENDIENTE MARK #4.
- Los enlaces dentro de texto corrido (el `pacificexperience.lat` de la franja de disclosure, el WhatsApp del bloque de contacto) miden 20 y 24 px de alto. **Es correcto**: son texto, no botones; estirarlos a 44 px rompería la línea en la que viven. El script los excluye a propósito y lo documenta.

---

## 7. Cómo probarlo

```bash
npm install
npm run lint       # eslint + check:pex-links
npm run test       # 156 casos
npm run build
npm run test:e2e   # 2 pruebas de Playwright (arranca next start solo)
npx tsc --noEmit
```

La primera vez, el e2e necesita el navegador: `npx playwright install chromium`.

### Humo sin base de datos (corrido en esta sesión)

Con `npm run build && npx next start -p 3021` y **sin `DATABASE_URL`**:

```bash
node scripts/smoke-bloque6.mjs http://localhost:3021   # → "Todo OK"
node scripts/movil-390.mjs     http://localhost:3021
```

Lo que comprueba el humo, todo en verde:

| Bloque | Comprobaciones |
|---|---|
| **6.1** | Las tres rutas dan 200 y emiten `TouristDestination` **sin `aggregateRating`**; Bahía enseña CTA a `/reservar/`; los tres enseñan CTA a `/charters/`; Taboga y Las Perlas nombran su ferry sin botón; `/destinos/no-existe` da 404; el `sitemap.xml` lista los tres y declara la alternativa en inglés |
| **6.2** | **13 pares de rutas** (`/…` y `/en/…`): las dos dan 200, el `<html lang>` es el que toca, **el canonical es autorreferente** y las dos declaran `es`, `en` y `x-default` con las mismas URLs |
| | El inglés es inglés de verdad: se buscan cadenas concretas en `/en/tours`, `/en/charters`, `/en/destinos/bahia`, `/en/como-funciona`, `/en/terminos` y `/en/reservar/tour-bahia` |
| | `/en/tours` enlaza a `/en/reservar/tour-bahia`, y el selector ofrece las dos rutas equivalentes |
| | `/reservar/tour-bahia/listo` y su versión inglesa siguen `noindex` y **sin `hreflang`** |
| | `/en/tours?partner=HOTELX` → **307 a `/en/tours`** (el aliado no cambia de idioma); `/en/compare` → 308 a `/en/charters/comparar`; `/compare` → 308 a `/charters/comparar` |

Nota sobre el humo: Next serializa el atributo como `hrefLang`; en HTML el nombre no distingue mayúsculas y Google lo lee igual, pero el script busca sin distinguirlas y lo deja escrito para que nadie vuelva a perder media hora con eso.

### Verificación de la regla 15

| Búsqueda en `src/` | Resultado |
|---|---|
| `atlantedelpacifico.com`, `ATLANTE10`, `Pocos cupos`, `127 rese`, `aggregateRating`, `sunset` (sin distinguir mayúsculas) | **0** |
| `stripe / paguelo / yappy / card_number` | **0** |
| `850 / 1450 / 2800 / 1800 / 3200` como precio | **0** |
| `1200` | sólo el ancho de la imagen OG en `layout.tsx` y en la ficha de producto, igual que en los bloques 2 a 5 |
| `pacificexperience.lat` fuera de `lib/pex.ts`, `content/catalog.ts` y `content/vessels.ts` | **0** (`npm run check:pex-links`) |

### Lo que falta probar en el CI de verdad

El workflow **no se ha ejecutado nunca**: sólo corre cuando haya un push, y este bloque no hace push (regla 2). Lo que se verificó en local es cada uno de sus pasos por separado, con los mismos comandos. La primera corrida real dirá dos cosas que aquí no se pueden saber:

1. si `npx playwright install --with-deps chromium` necesita permisos extra en el runner (no debería: `ubuntu-latest` los trae);
2. **qué puntuación de Lighthouse sale de verdad** en las tres rutas, y si el umbral de 85 es alcanzable hoy o hay que trabajarlo (por eso el job no bloquea).

---

## 8. Qué cambia para quien ya usaba el sitio

| Antes (bloques 0–5) | Ahora |
|---|---|
| El idioma vivía en la cookie `locale` y **la misma URL podía verse en dos idiomas** | El idioma es la URL: `/tours` español, `/en/tours` inglés. La cookie desaparece |
| El selector ES/EN cambiaba el texto sin cambiar la URL | Es un enlace a la misma página en el otro idioma, y recarga |
| Sin `hreflang` en ninguna página | Las 13 rutas públicas declaran `es`, `en` y `x-default`, y el sitemap también |
| El título y la descripción de cada página estaban sólo en español | Salen del diccionario, en los dos idiomas |
| Las pantallas de tránsito heredaban el canonical de la home | No declaran canonical ni `hreflang` |
| Los destinos eran tres párrafos en la home, con cifras sin fuente, sin página propia | Tres páginas con todas las formas de ir, sin ninguna cifra en la prosa, enlazadas desde la home, el pie y el sitemap |
| Sin CI: lo único que protegía la rama era acordarse de correr `npm run lint` | Cada push a `feature/*` corre lint, tests, build y el e2e del funnel |
| El enlace "Ver detalle" y los del pie medían 18 px de alto | 44 px |

---

## 9. PENDIENTE MARK

| # | Tema | Detalle y qué hay que decidir |
|---|---|---|
| 1 | **Encender el CI** | El workflow está escrito y **nunca se ha ejecutado**: hace falta un push a `feature/atlante-broker` (lo hace tu script) y que GitHub Actions esté habilitado en el repo. No consume nada de pago en un repo público; en uno privado gasta minutos de la cuota gratuita. |
| 2 | **Umbral de Lighthouse** | Está en 85 móvil para rendimiento y accesibilidad, como pide el PRD (A9), y el job **no bloquea**. Cuando haya una primera medición real hay que decidir si se sube a bloqueante o si el objetivo cambia. Hoy no hay puntuación que reportar (§4). |
| 3 | **Slugs de destino de los productos nuevos** | El cruce destino → productos es una lista en `src/content/destinations.ts`. Un producto que des de alta en `/admin/catalogo` **no aparece solo** en su destino: hay que añadir su slug. Si esto va a pasar seguido, la alternativa es una columna `destinations` en `Product` (migración nueva). |
| 4 | **El funnel no tiene `<h1>`** | `/reservar/[slug]` abre con un `<h2>`. Es un punto de accesibilidad y de SEO menor; se arregla en un minuto, pero toca la pantalla que más conversión mueve y no la iba a cambiar sin que lo sepas. |
| 5 | **Tipografía de 10–12 px** | Trece declaraciones en `globals.css` (§6) que chocan con la regla 14 ("nada de 12 px gris sobre claro"). Afectan a marca, insignias, etiquetas de tarjeta y pie, en todo el sitio y desde antes de este bloque. Subirlas a 13 px cambia la identidad visual: es tu decisión, no la de la sesión de código. |
| 6 | **Aplicar las migraciones** | `0001_init`, `0002_broker_v2`, `0003_catalog`, `0004_charters` y `0005_partners` siguen escritas y **sin ejecutar**. El bloque 6 no añade ninguna. Antes de `prisma migrate deploy` hay que restaurar el proyecto Supabase "ATLANTE" (decisión #10 del PRD). |
| 7 | **Search Console** | Con `hreflang` publicado conviene dar de alta también el .lat en Search Console (T13) y volver a mandar el `sitemap.xml`, que ahora declara las dos versiones de cada página. |
| 8 | **Fotos propias de los destinos** | Las tres páginas no tienen imagen: las tarjetas usan `og-atlante.jpg` como marcador desde el bloque 2. Con fotos reales de Taboga, Las Perlas y la Bahía, estas páginas son las que mejor van a posicionar. |
| 9 | **El ferry a Taboga sigue apagado** | Mientras `available` sea `false` (decisión #8 del PRD), `/destinos/taboga` **no ofrece ningún ticket**: sólo las tres naves y la nota de "publicado, sin venta hoy". En cuanto lo actives en `/admin/catalogo`, aparece con su precio y su CTA sin tocar código. |
| 10 | **Guías comparativas** | T59 del TODO (ferry vs chárter a Taboga, cuánto cuesta un yate por persona, mejor mes para Las Perlas). No estaba en este bloque; las páginas de destino son el sitio natural desde donde enlazarlas. |
