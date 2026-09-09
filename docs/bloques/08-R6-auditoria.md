# Bloque 8 — R6 · Auditoría completa del código y correcciones (P1)

Origen: auditoría del repo `mharr92-hub/atlante` en `main` (commit `aaa2303`, 09/09/2026) hecha por Claude antes de los bloques. Los bloques 1–7 ya corrigen parte de lo detectado; en cada punto, primero verifica el estado actual del repo y, si ya está resuelto, anótalo como "ya resuelto en bloque N" en el reporte y pasa al siguiente. Nada de este bloque cambia el alcance funcional: es calidad, rendimiento, SEO técnico, seguridad y mantenibilidad.

## A. SEO técnico (impacto alto)

A1. Canonical heredado: `src/app/layout.tsx` define `alternates: { canonical: site.url }` en el layout raíz, así que TODA página sin `alternates` propio declara como canonical el home (legales, `/tours`, `/charters`, `/reservar/*`, etc.) y Google las trata como duplicados del home. Quita `alternates` del layout raíz y define el canonical por página (en `generateMetadata` o `metadata` de cada ruta), siempre con `https://www.atlantedelpacifico.lat` + ruta.

A2. `sitemap.ts` usa `lastModified: new Date()` en cada petición: el sitemap "cambia" siempre y pierde valor. Usa fechas reales: `verifiedAt` del catálogo para productos/naves y una constante por página estática (o la fecha del último commit del archivo).

A3. `metadata.keywords` no lo usa ningún buscador: elimínalo.

A4. Acentos: casi todo el texto en español está sin tildes ("Panama", "Pacifico", "Atlantico", "resenas", "deposito"): 22 apariciones de "Panama" sin tilde y solo 5 archivos con caracteres acentuados. Para una marca premium y para SEO ("Panamá") hay que escribir español correcto. Corrige TODO el copy ES (i18n, catálogo, legales, admin) con tildes y eñes; el nombre de marca queda como Mark lo escriba (PENDIENTE MARK: "Atlante del Pacífico" con tilde en todos lados o no).

A5. JSON-LD: el `TravelAgency` del home debe llevar `sameAs` (Instagram si Mark lo confirma) y `areaServed` (Panamá); los `TouristTrip`/`Product` deben declarar `provider`/`brand` = Pacific Experience. Escapa `<` al serializar (`JSON.stringify(x).replace(/</g, "\\u003c")`) porque desde el bloque 3 hay textos editables en admin que terminan dentro de `<script>`.

A6. Idioma: el HTML se sirve según la cookie `locale` en la MISMA URL, así que Google solo indexa la versión ES y el EN no existe para buscadores. Confirma que el bloque 6 dejó rutas `/en/*` con `hreflang`; si no, hazlo aquí (middleware por prefijo + `metadata.alternates.languages`).

## B. Rendimiento (impacto alto)

B1. Todo el sitio se renderiza dinámicamente en cada petición porque el layout raíz llama a `cookies()` (locale) y las fichas también: ninguna página es estática ni cacheable en CDN, incluido el home. Solución: resolver el idioma en `middleware.ts` (prefijo `/en`) y quitar `cookies()` de layouts/páginas públicas; las páginas públicas pasan a estáticas con `revalidate` (p. ej. 3600) y `generateStaticParams`. Las rutas de admin y APIs siguen dinámicas. Mide antes/después con `next build` (páginas ○/●).

B2. Imágenes: `public/og-atlante.jpg` pesa 397 KB y se usa como hero, galería y OG en todas partes con `<img>` sin tamaños. Usa `next/image` (`fill` + `sizes` en hero con `priority`; `width/height` en tarjetas), formatos AVIF/WebP automáticos, y comprime los originales a ≤ 200 KB. El hero por CSS `background-image` no se optimiza: cámbialo a `<Image fill priority>` con el overlay encima.

B3. CSS: `globals.css` tiene 1.302 líneas hechas a mano y Tailwind v4 importado pero casi sin usar (7 usos de utilidades). Decide una sola vía y documéntala en README: (a) quitar Tailwind y `@tailwindcss/postcss` (menos dependencias, CSS más pequeño) o (b) migrar gradualmente. Elige (a) salvo que ya haya componentes nuevos con utilidades. Elimina las clases muertas (`.review-*`, `.quote`, `.popup-*`, `.urgency`, `.currency-select`, `.stepper`, `.price-*`, `.compare-*`, `.route-map`, `.leaflet-*` si ya no se usan) y añade `@media (prefers-reduced-motion: reduce)` para cualquier animación.

B4. Fuentes: `--font-serif` se usa en 14 sitios pero no hay `@font-face` ni `next/font`: la serif depende de lo que tenga el visitante. Define las fuentes con `next/font` (Google Fonts autoalojadas, sin FOIT) o con archivos locales; `Inter` igual. Sin llamadas a fonts.googleapis en tiempo de ejecución.

B5. Clima: `WeatherWidget` llama a Open-Meteo desde el navegador en cada visita. Crea `GET /api/weather` con `fetch(..., { next: { revalidate: 900 } })` y consume eso; permite una CSP estricta y reduce llamadas a terceros. Si no aporta a la conversión, considera quitarlo (decisión: déjalo, es dato real).

B6. Analítica: Meta Pixel con `strategy="lazyOnload"`; GA4 puede seguir `afterInteractive`. Verifica que sin IDs no se inyecte nada (ya es así).

B7. `Header` fija con listener de scroll: OK (passive). Añade `loading.tsx` en `/tours`, `/charters` y `/reservar/[slug]` para no dejar pantallas en blanco.

B8. Región: en `vercel.json` fija `"regions": ["iad1"]` para que las funciones corran en us-east-1, la misma región que la base de datos de Supabase (latencia de DB mucho menor).

## C. Seguridad (impacto medio-alto)

C1. Cabeceras: `next.config.ts` no envía ninguna. Añade (si el bloque 7 no lo hizo): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima, y una `Content-Security-Policy` en modo `Report-Only` primero (permitir GA4, Meta, Open-Meteo/`/api/weather`, wa.me) — los estilos inline (`style={{…}}`, 29 usos) impiden una CSP estricta: ver D2.

C2. Admin: sesión HMAC con `AUTH_SECRET` (bien). Añade: rate-limit en login (bloque 7), `AUTH_SECRET` mínimo 32 bytes validado al arrancar (log de aviso si es corto), y una variable `SESSION_VERSION` incluida en la firma para poder cerrar todas las sesiones cambiándola. Cookie `secure` solo en producción (ya está).

C3. Errores: la API antigua devolvía `e.message` al cliente. Regla para todas las rutas nuevas: mensajes genéricos al cliente (`{ ok:false, error:"internal" }`) y detalle solo en `console.error` del servidor. Revisa `/api/leads`, `/api/handoff`, `/api/pex/*`, `/api/partner-applications`.

C4. `GET /api/handoff/[token]` y `POST /api/pex/booking-confirmed`: comparación de secretos con `timingSafeEqual`, `Cache-Control: no-store`, sin registrar el token completo (solo 6 primeros caracteres), y `Content-Type` estricto. Verifica que el rate-limit en memoria no rompa en serverless (cada instancia tiene su memoria: aceptable, documenta el límite).

C5. Datos personales: define retención en `/privacidad` (p. ej. anonimizar leads a los 12 meses) y añade al cron de housekeeping (bloque 3) la anonimización de leads con más de 365 días (`name/email/phone` → `[borrado]`, conservando estado y montos para el reporte).

C6. Repositorio público: `docs/` y el historial de git son visibles. Recomendación para Mark (ya en TODO-mark M01): repo privado. En código: asegúrate de que ningún secreto ni URL con credenciales esté en el historial (`git log -p | grep -i "postgres://"` = 0) y deja `.env.example` como único archivo de entorno versionado.

## D. Calidad de código y mantenibilidad

D1. Idioma en tres sitios distintos (cookie en servidor, contexto en cliente, `navigator.language` al montar): produce parpadeo ES→EN y riesgo de errores de hidratación. Con el middleware de B1 el idioma viene de la URL y el contexto solo lo lee; elimina la detección por `navigator.language` (o úsala solo para sugerir "View in English" una vez).

D2. Estilos inline (`style={{…}}`, 29 usos) repartidos por componentes: muévelos a clases en `globals.css` (o utilidades) para consistencia y para poder activar CSP.

D3. Diccionario `i18n.ts` monolítico: divídelo por dominio (`common`, `home`, `funnel`, `admin`, `legal`) manteniendo `t()` tipado; elimina las claves muertas y las duplicadas con expresiones `locale === "es" ? … : …` repartidas por los componentes (todas deben pasar por el diccionario).

D4. Fecha y zona horaria: el código construye fechas con `T00:00:00.000Z` (UTC). Panamá es UTC-5 sin horario de verano: centraliza en `src/lib/dates.ts` (`todayInPanama()`, `formatDatePa()`, `TZ = "America/Panama"`) y úsalo en el calendario del funnel, en el admin y en el housekeeping, para que "hoy" y "mañana" sean los de Panamá y no los del visitante.

D5. Dinero: `money()` redondea a 0 decimales por defecto; los precios por persona calculados (86.67, 67.25) deben mostrar 2 decimales cuando no son enteros. Añade tests.

D6. Prisma: modelos muertos (`Customer`, `Payment`, `Coupon`, `GiftCard`, `Review`, `AvailabilitySlot`, `Booking`) tras el bloque 2. Crea una migración `drop_legacy` SOLO si `/admin` y los tests no los usan y anótalo como decisión reversible; si prefieres conservarlos, documenta en `docs/OPERACION.md` que no se usan. Corrige el smell de `AvailabilitySlot.timeSlot` nulo en clave única si el modelo se conserva. Sustituye `package.json#prisma` por `prisma.config.ts` (Prisma 6.19 lo avisa).

D7. Dependencias: quita `leaflet`, `react-leaflet`, `@types/leaflet` si el mapa se eliminó; añade `"engines": { "node": ">=20" }` y `.nvmrc` = `22`; `npm audit` sin vulnerabilidades altas; `npm outdated` documentado en el reporte (sin subir de versión mayor de Next sin pedirlo).

D8. Configuración: `next.config.ts` con `poweredByHeader: false`, `images.formats: ["image/avif","image/webp"]`, `headers()` (C1) y `redirects()` (bloque 1). `tsconfig` `target` a `ES2022`. Prettier + `npm run format:check` en CI.

D9. Manejo de errores y observabilidad: `error.tsx`/`not-found.tsx` (bloque 7), `console.error` estructurado (`{ scope, msg, leadId }`) y `/api/health`. Sin contratar servicios: deja preparado un `src/lib/report-error.ts` con proveedor `console` y punto único para enchufar Sentry u otro (PENDIENTE MARK).

D10. Tests y CI: cobertura mínima obligatoria: `buildPexUrl`, cálculo de totales del funnel, precio por persona de naves, firma del webhook, `dates.ts`, `money()`. `npm run lint && npm run test && npm run build` en CI para cada push (bloque 6); añade `npm run check:pex-links` y un job de Lighthouse no bloqueante.

D11. Accesibilidad: `aria-pressed` en el selector ES/EN, `:focus-visible` visible en botones y enlaces, enlace "Saltar al contenido", contraste ≥ 4.5:1 en `.fact`, `.card-body-text`, textos `rgba(10,36,33,.55)` y badges; `aria-live="polite"` en la cuenta regresiva de `/listo`; inputs con `<label>` (no solo placeholder). Recorrido completo con teclado del funnel.

D12. README y docs: README con arquitectura real (rutas, catálogo, modo puente/integrado, variables), y `docs/OPERACION.md` (bloque 7) enlazado.

## E. Verificación del bloque

- `npm run lint && npm run build && npm run test`; en el reporte incluye la tabla de páginas del build (estáticas vs dinámicas) antes y después de B1, el peso del CSS y del JS del home antes y después (B2–B4), y el resultado de `npm audit`.
- `grep -rn "alternates" src/app/layout.tsx` sin canonical global; `grep -rho "Panama\b" src | wc -l` = 0 (todo con tilde) salvo nombres propios que Mark decida.
- Reporte `docs/reportes/bloque-08.md` con: hallazgos ya resueltos por bloques anteriores, cambios por archivo, métricas antes/después y `PENDIENTE MARK` (tilde en la marca, Instagram, proveedor de errores, retención de datos).