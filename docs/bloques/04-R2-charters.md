# Bloque 4 — R2 · Marketplace de charters (P1)

Objetivo: `/charters` como listado unificado de naves (las 3 de PEX ahora; operadores aliados después), con comparador, precio por persona calculado, y dos modos de cierre: "Reserva directa" (PEX → checkout con `ref`) y "Cotizar" (aliado → lead + WhatsApp). Sin naves ni operadores ficticios: solo las 3 de PEX con los datos del bloque 2 (sección 2.1).

## 4.1 Modelo

- Prisma: `Operator { id, slug @unique, name, whatsapp?, email?, commissionPct Decimal(5,2)?, contractSignedAt?, ampLicense?, insuranceUntil?, verified Boolean @default(false), active Boolean @default(true) }` y `Vessel { id, slug @unique, operatorId, name, type, lengthFt?, capacityMax, marina, pricing Json (filas: ruta, duración h, capacidad máx., precio barco), routes Json, includes Json, onRequest Json, depositPct, cancellationPolicy Json ({es,en}), photos Json, video?, closeMode ("deeplink"|"quote"), pexVesselSlug?, pexPath?, verifiedAt, sourceUrl?, active, order }`. Migración `0004_charters` (diff, sin tocar DB remota). Seed: operador `pex` + Aura, Pacific Ferry 1 y Sirena del Mar con la tabla de precios completa del bloque 2.
- `src/lib/vessels.ts` con fallback en código (`src/content/vessels.ts`) igual que el catálogo.

## 4.2 Páginas

- `/charters`: filtros (capacidad mínima, presupuesto máximo por barco, duración 4/8/12 h, ruta Bahía/Taboga/Las Perlas, tipo, marina); control "¿Cuántas personas?" que calcula "desde $X por persona" = precio del tramo de capacidad que cubre a ese grupo ÷ personas (como hace PEX: Aura "desde $55/persona"); orden por precio por persona. Tarjeta: foto, nombre, tipo, capacidad, "desde $1,300 (4 h · hasta 15 pax)", badge `Reserva directa` o `Cotizar`.
- `/charters/[slug]`: ficha estándar (nombre, tipo, capacidad, marina, tabla de precios por ruta/duración/capacidad, incluye, bajo solicitud con precios cuando PEX los publica, políticas de apartado y cancelación, galería, operador). CTA principal según `closeMode`: `deeplink` → formulario corto (nombre, WhatsApp, email, fecha, horas, pax, ocasión) que crea un lead `charter_pex` vía `POST /api/leads` y redirige a `buildPexUrl({ target: "charter_checkout", vessel, leadId, handoffToken, campaign: slug })` con la misma pantalla `/listo` del bloque 2; `quote` → `/cotizar/[slug]`.
- `/charters/comparar?v=aura,pacific-ferry-1`: hasta 4 naves lado a lado: capacidad, precio por 4/8/12 h, precio por persona para el grupo indicado, incluye/no incluye, apartado, política.
- `/cotizar/[slug]` (para `closeMode = quote`; hoy sin naves, pero la ruta queda lista): formulario → lead `charter_partner` con estado `quote_requested` → abre WhatsApp de Atlante con el resumen; texto "Te respondemos en menos de 2 horas en horario de atención" solo si Mark lo confirma (PENDIENTE MARK; mientras tanto "Te respondemos por WhatsApp").
- `/aliados` y `/aliados/registro`: propuesta para operadores (ficha + leads calificados; comisión "según acuerdo" — PENDIENTE MARK), hoteles/concierges (código de aliado) y agencias; formulario → `PartnerApplication` (`POST /api/partner-applications`, con rate-limit) + `/admin/aliados` para revisarlas.
- Home: `ChartersSection` muestra las 3 naves con precio por persona para 15 personas y enlace a `/charters`.

## 4.3 Admin

- `/admin/naves` y `/admin/operadores`: CRUD; `commissionPct` interno (nunca público); checklist "verificado" (licencia AMP, seguro vigente, contrato firmado) → solo con los 3 se muestra el sello "Operador verificado" en público.
- `/admin/leads` muestra los leads de charter con `vesselSlug`, horas y pax; estados `quote_requested → quoted → accepted → paid / lost` con acciones.

## 4.4 Verificación

- Tests: cálculo de precio por persona (Aura 15 pax Bahía 4 h = $1,300/15 = $86.67; Sirena 80 pax Las Perlas = $5,380/80 = $67.25), filtros, y que toda URL de "Reserva directa" contiene `ref=ATLANTE`.
- Lighthouse móvil ≥ 85 en `/charters` (documenta el resultado con `npx lighthouse` si está disponible; si no, anótalo).
- Reporte `docs/reportes/bloque-04.md`.