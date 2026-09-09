# Atlante del Pacífico

Sitio de **Atlante del Pacífico** (`www.atlantedelpacifico.lat`): un broker
marítimo que compara ferry, tours y charters de operadores verificados en el
Pacífico panameño y lleva al cliente al pago **directo con el operador**.

**Next.js 16 (App Router, TypeScript) + Tailwind v4 + Prisma 6** sobre Postgres
(proyecto Supabase "ATLANTE"), desplegado en Vercel. Es un proyecto totalmente
separado de Pacific Experience (PEX, `pacificexperience.lat`).

## Reglas

Tres reglas mandan sobre cualquier otra consideración:

1. **Atlante nunca cobra.** No hay pasarela, formulario de tarjeta, SDK de pagos
   ni ruta de pago. El pago ocurre en Pacific Experience o con el operador
   aliado, que es quien presta el servicio y responde por él.
2. **`buildPexUrl()` es el único enlace a PEX.** Vive en `src/lib/pex.ts` y es
   el único archivo donde puede aparecer el dominio de PEX. Toda salida lleva
   `ref=ATLANTE` y las UTM; nunca viajan nombre, correo ni teléfono en la URL.
3. **Nunca la palabra "Sunset"**, ni en ES ni en EN, ni como identificador
   interno. Se usa "atardecer" / "evening" / "dusk".

A esas se suma el principio que ordenó R0: **cero datos inventados en público**.
Un precio, un cupo, una reseña o una métrica sólo se muestran si tienen fuente y
fecha de verificación.

## Correr en local

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm run lint
```

El sitio público funciona sin ninguna variable de entorno: si falta
`DATABASE_URL` o la base está caída, la navegación y el paso al operador siguen
funcionando. Ver `.env.example` para la lista completa de variables.

## Arquitectura

```
src/
  app/
    (site)/            Sitio público
      page.tsx         Home (hero, disclosure, secciones)
      tours/           Catálogo (placeholder) y ficha /tours/[slug]
      charters/        Charters (placeholder)
      como-funciona/ terminos/ privacidad/ cancelaciones/   BORRADOR
    admin/             Panel con contraseña (noindex)
    sitemap.ts robots.ts
  components/
    site/              Header, Footer, WhatsApp flotante, PexDisclosure, LegalShell
    sections/          Secciones del home
    tour/              TourCard, TourDetail, RouteMap, WeatherWidget, Badges
    marketing/         Analytics (GA4 / Meta, inertes sin sus IDs)
  content/             tours.ts (catálogo placeholder, se reemplaza en R1)
  lib/                 i18n, contexto de locale, formato, pex.ts, auth, db
  config/              site.ts (marca, dominio, WhatsApp, navegación)
prisma/schema.prisma   Modelo de datos
```

Bilingüe **ES/EN** por cookie `locale` resuelta en el servidor, con objetos
`{ es, en }` y el diccionario de `src/lib/i18n.ts`. Moneda: **sólo USD**.

## Estado

- **R0 — Limpieza y verdad: hecho** (bloque 1). Dominio `.lat`; sin reseñas,
  sin `aggregateRating`, sin métricas de confianza, sin píldoras de urgencia,
  sin selector de moneda, sin popup de descuento y sin la palabra "Sunset";
  `buildPexUrl()`, disclosure de agente autorizado, páginas legales en
  BORRADOR, redirecciones 301 y `.env.example`. Ver
  `docs/reportes/bloque-01.md`.
- **R1 — Ticketería PEX (modo puente)**, **R1c — modo integrado**,
  **R2 — marketplace de charters**, **R3 — alianzas** y **R4 — crecimiento**:
  pendientes. El alcance de cada uno está en `docs/PRD-atlante-v2.md` y el
  desglose en `docs/TODO-atlante-v2.md`.

## Notas

- `og-atlante.jpg` y `logo.png` son la única imagen real; las galerías reusan el
  hero como placeholder. Las fotos reales llegan con el catálogo de R1.
- WhatsApp, marca, dominio y navegación viven en `src/config/site.ts`.
- Las migraciones contra la base remota las corre Mark (`prisma migrate deploy`).
