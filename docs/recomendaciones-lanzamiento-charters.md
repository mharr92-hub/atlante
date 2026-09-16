# Recomendaciones para que `/charters` pueda vender de verdad

Fecha: 2026-09-16 · Complementa `docs/reportes/auditoria-charters-grok.md`.  
Código de partida: `main` @ `02bc0fa`. **No es un backlog de features de marketing**; es lo que falta para el primer abono real con la cara de Atlante, y lo que no hay que comprar tráfico hasta resolver.

Regla heredada: si no hay fuente, se marca `NO ENCONTRADO` o **PENDIENTE MARK**. No se rellenan tarifas “razonables”.

---

## 1. Bloqueante para el primer cobro real

Lo mínimo para recibir un abono con confianza. Sin esto, el botón “Pagar abono 30 %” o miente (no hay pasarela) o cobra mal.

### 1.1 Cablear Postgres + PagueloFácil en el proyecto Vercel `atlante`

Hoy el probe público `GET /api/payments/paguelofacil/availability` en `www.atlantedelpacifico.lat` responde `{ "available": false }`. Sin eso no hay `LinkDeamon`.

Variables (ya documentadas en README; **no están vivas**):

- `DATABASE_URL` (pooled) y `DIRECT_URL`
- `PUBLIC_APP_URL=https://www.atlantedelpacifico.lat`
- `PAGUELOFACIL_CCLW`, `PAGUELOFACIL_API_TOKEN` (Authorization **cruda**, sin `Bearer`)
- Opcional: `PAGUELOFACIL_API_URL` / `VERIFY_URL` / `RETURN_URL` (hay defaults de prod)

Aplicar schema: `npx prisma db push` o `psql "$DATABASE_URL" -f prisma/charter-requests.sql`.

En el dashboard de PagueloFácil → Notificaciones:

`POST https://www.atlantedelpacifico.lat/api/payments/paguelofacil/webhook`

Hacer **un pago de $1 en sandbox o un abono real de prueba** y comprobar las tres vías: return URL, webhook, y que `CharterRequest.paymentStatus` pase a `paid` sólo después del S2S. El código ya no confía en el body; hay que probarlo con credenciales de verdad, no con mocks.

**PENDIENTE MARK:** ¿merchant propio de Atlante o el de Pacific Experience? El hosted checkout enseña el nombre del comercio. Si es el de PEX, el cliente ve PEX en el paso de la tarjeta aunque el sitio no lo nombre. Eso rompe la regla de marca igual que un logo.

### 1.2 No cobrar el 30 % de un total aplanado

En PEX (lectura 2026-09-09, misma fuente que el brief llama “datos ya verificados”) el $1,300 de 4 h es el tramo **hasta 15 pax**, no el de 30 u 80.

Antes del primer cobro hay que elegir **una** de estas, no mezclarlas:

| Opción | Qué implica | Quién decide |
|---|---|---|
| **A. Cargar la tabla verificada** (ruta × horas × cupo) y calcular el abono en servidor según pax | El form deja de ser 4/8/12 h planos. Hay que preguntar destino (Bahía / Taboga / Perlas) o fijar una ruta por duración como hacía PEX (4 h Bahía, 8 h Taboga, 12 h Perlas) | Mark: ¿esa matriz sigue vigente en 2026-09-16? |
| **B. No crear enlace PF** hasta tener la matriz confirmada otra vez | El botón queda en “Enviar solicitud” / WhatsApp, como ya pasa en 8 h y 12 h | Más seguro si la tarifa pudo cambiar |
| **C. Cobrar siempre el tramo más caro del bloque** (p. ej. 4 h Ferry = $1,790) y devolver diferencia | Evita subcobrar; puede enojar a grupos chicos | Mark |

Cobrar $390 a un grupo de 30 en Pacific Ferry 1 **no** es “un detalle de UX”. Es dejar dinero en la mesa o pelear el saldo después.

La fuente interna está en `feature/atlante-broker` (`src/content/vessels.ts`). Copiarla a `main` **sin** `sourceUrl` clicable a PEX. Citar en comentario de código: `verifiedAt` + “tabla PEX 2026-09-09; no enlazar en UI”.

### 1.3 El lead tiene que existir y el cliente tiene que poder citarlo

Bloqueantes de ops, no de pasarela:

1. **Rechazar el POST** (5xx o 503) si no se pudo persistir. Hoy se responde `ok: true` con `persisted: false` y el copy de `/gracias` dice que se guardó.
2. Mostrar en `/gracias` un **número de solicitud** corto (p. ej. `ATL-` + 6 hex) y el mismo número en el mensaje prefill de WhatsApp.
3. Listar `CharterRequest` en `/admin` (hoy el dashboard mira `Booking`, que el funnel de charters **no escribe**). Sin eso, el abono pagado vive en Postgres y nadie de concierge lo ve.
4. Definir quién mira esa cola en &lt; 24 h y con qué WhatsApp escribe al operador. El software no confirma disponibilidad solo.

### 1.4 Apagar precios sin verificar que ya están en producción

`/compare` y `/tours/[slug]` son **200** con tarifas de Phase 1 ($850, $1,450, …) y “reserva ahora, paga el resto después”. El home dice que Tours es “Próximamente”. Un cliente o Google que entre por URL ve un catálogo que el brief prohíbe.

Mínimo antes de cobrar (y antes de Search Console):

- `notFound()` en `/tours/[slug]` y `/compare`, **o** página “Próximamente” sin cifras.
- `robots.txt`: `Disallow: /tours`, `/compare`, `/admin`, `/api`, `/reservar/*/gracias`.
- Quitar JSON-LD `Offer` / `InStock` de esos slugs.

No hace falta borrar `src/content/tours.ts` el día 1; hace falta que **deje de ser público**.

### 1.5 Disclaimer: el texto de producto vs el texto legal

El copy locked en `DEPOSIT_DISCLAIMER_ES` (`src/data/charters.ts`) es claro en producto: el abono confirma la **solicitud**, chequeo 24 h, alternativa o **100 % de reembolso**.

Para el primer cobro real falta **PENDIENTE MARK**:

- ¿Ese párrafo es el legal definitivo o hay que pasar por un abogado / T&C en `/terminos`?
- ¿El reembolso es automático en PagueloFácil o manual (transferencia)? ¿En cuántas horas?
- ¿El 70 % restante se cobra cómo y cuándo? PEX decía “24 h antes de navegar”. El MVP no lo cobra ni lo agenda.
- ¿La política de **las 9 terceras** es la misma? Todavía no hay contrato ni tarifa con ellas; cobrar 30 % de un “precio por confirmar” no debería ocurrir (y el código, en esas naves, ya no cobra — hay que mantenerlo así).

No inventar una página legal en este ciclo si Mark no entrega el texto. Sí bloquear el cobro si el disclaimer público promete un reembolso que ops no puede ejecutar.

### 1.6 Marca en el momento del pago

- Favicon celeste (`public/favicon.png`): el tab del banco/Safari no se ve Atlante. Sustituir por el tridente de `og-atlante.jpg` cuando Mark dé el PNG (no generar uno “parecido”).
- Confirmar que el extracto / `CDSC` de PagueloFácil dice “Atlante” y no el comercio PEX.
- No reintroducir `public/logo.png` (este PR lo elimina: era The Pacific Experience).

### 1.7 Prueba de fuego (checklist operativo)

Antes de anunciar el cobro:

- [ ] Un pago sandbox/prod de 4 h, 8 pax, Pacific Ferry 1 → lead `paid`, WhatsApp de concierge recibido, número de solicitud visible.
- [ ] Mismo flujo, usuario cierra la pestaña en PF → lead `unpaid` en admin, rescatable por WhatsApp.
- [ ] Webhook con Oper inventado → no `paid`.
- [ ] POST con `depositAmount` manipulado → servidor ignora (ya lo hace).
- [ ] 8 h / 12 h sin tarifa cargada → **cero** cargo PF.
- [ ] `/tours/travesia-al-atardecer` y `/compare` → 404 o sin precios.
- [ ] Grep de UI: 0 “Pacific Experience” / “PEX”; `/logo.png` → 404.

---

## 2. Importante pero no bloqueante (antes de pagar tráfico)

Mejoras de conversión y confianza. **Sin inventar prueba social.**

### 2.1 Fotos reales por nave

Hoy las 11 (y ANA C) usan `og-atlante.jpg`. En ficha, “galería” = tres veces el mismo tridente. Para Pacific Ferry 1 y Sirena, Mark o PEX deben entregar fotos **propias** (cubierta, salón, mar). No usar stock genérico de yate ni assets con marca PEX.

Las 9 terceras: o foto del operador con permiso, o no publicar ficha. Una card “Próximamente” **sin** foto repetida 10 veces vende más honesto que un grid de tridentes.

### 2.2 Quitar o vaciar la prueba social de mentira

El home afirma 4.9 ★, 127 reseñas verificadas, “recopiladas automáticamente”, tres citas Google/TripAdvisor, +200 experiencias, 14 min de respuesta. **Fuente: NO ENCONTRADO.** Google puede penalizar `aggregateRating` inventado.

Hasta tener reseñas reales de Atlante (o permiso explícito de Mark para citar reseñas de un tercero **nombrando al tercero**, lo cual choca con “cero PEX”):

- Quitar `ReviewsSection`, el JSON-LD `aggregateRating` y los números del `trust-row`.
- Quitar el quote clonado en Nosotros.
- No sustituir por “María, 5 estrellas” de relleno.

Si existen testimonios reales de WhatsApp de charters ya hechos, se publican con nombre y permiso. Si no, la sección no existe.

### 2.3 Proceso en 3 pasos, visible

El disclaimer está, pero el form salta a “Pagar abono 30 %” con un `$390` grande. Antes de ads, una franja de 3 pasos en ficha y `/charters`:

1. Eliges nave, fecha y horas  
2. Pagas el 30 % (solicitud, no reserva)  
3. Te confirmamos por WhatsApp en 24 h (o te devolvemos)

Eso ya está en el FAQ. Hay que **verlo antes del botón**, no sólo debajo.

### 2.4 WhatsApp

El float existe y el número `+507 6860 3623` está en ficha. Ajustes de conversión, no de dato:

- Prefill distinto por página (ficha vs home). El default todavía dice “tours o charters”.
- El mensaje post-solicitud debe llevar el **número de solicitud** (§1.3).
- No duplicar el popup de email a los 18 s encima del float: hoy promete un 10 % que nadie envía (`ATLANTE10`). Apagar `LeadPopups` hasta tener Resend + un código real en `Coupon`.

### 2.5 Header y móvil

Sin scroll horizontal en fichas a 390 px (bien). Antes de ads:

- Subir a 44 px: hamburguesa (42), CTA header (42), ES/EN (29), “Ver y reservar” (18), FAQ summary (33). Eso **ya se midió y se arregló** en `feature/atlante-broker` bloque 6; no está en `main`.
- Aliviar el header en 390 px: la marca se recorta. O logo-mark solo, o CTA más corto (“Flota”).
- Español con tildes en títulos y FAQ (“Cómo reservo”, “reseñas”, “Pacífico”) — PENDIENTE MARK si la marca lleva tilde.

### 2.6 Nombre de las naves live

El brief: **Pacific Ferry 1**. El sitio: “Pacific Ferry”. Decisión de Mark; no recortar “1” por si acaso. Sirena del Mar está bien.

### 2.7 Flota “Próximamente”

Mostrar 9 nombres sin ficha está bien (demanda). No mostrar ANA C hasta que Mark la meta en las 11. No decir “cuando Mark cargue datos” en la web pública.

Cuando haya **un** dato verificado de un tercero (precio 4 h **o** marina **o** pax, con fuente), se publica esa ficha sola. No se rellenan los otros campos.

### 2.8 Ferry y Tours

Dejarlos como “Próximamente” en el hero. No reactivar catálogo hasta tarifas verificadas. El puente PEX de `feature/atlante-broker` es otro producto; mezclarlo otra vez con este cobro directo es una decisión de Mark, no un TODO de código silencioso.

---

## 3. Deuda técnica (de la Parte 1, no es de vida o muerte para el primer cobro)

Sacado de lo marcado **No cumple** / **Parcial** que no está en §1. Orden aproximado de dolor.

| Deuda | Origen | Por qué no es bloqueante del primer cargo | Qué hacer pronto |
|---|---|---|---|
| Canonical global del layout = home | SEO A1 | Las fichas live ya pisan canonical | Quitar `alternates` del root layout |
| `lastModified: new Date()` en sitemap | SEO A2 | Sitemap corto y correcto en URLs | Fecha fija por archivo |
| Idioma por cookie, sin `/en` ni hreflang | SEO A6 | El cobro es ES; EN es display | O rutas `/en/*` (rama broker) o aceptar que Google no ve EN |
| Todo dinámico por `cookies()` | Rendimiento B1 | Tráfico aún bajo | Locale por URL o middleware; `revalidate` en marketing |
| `og-atlante.jpg` 397 KB + `<img>` / CSS background | B2 | No impide cobrar | `next/image`, comprimir ≤ 200 KB, fotos de nave |
| Sin `next/font` | B4 | Estética | Inter + serif autoalojadas |
| Open-Meteo desde el browser (sólo tours) | B5 | Tours debería estar apagado | Si vuelve: `/api/weather` con `revalidate` |
| Sin cabeceras de seguridad | C1 | Vercel pone HSTS; el webhook no depende de CSP | `headers()` + `poweredByHeader: false` |
| Rate-limit login admin / POST reservar | C2 | Primeros cobros serán pocos | Límite en memoria documentado (serverless) |
| `AUTH_SECRET` ausente de `.env.example` | C2 | Admin no es el funnel | Documentar + exigir 32 bytes |
| Oper de PF no unique; `PARM_1` opcional en S2S | Punto 2, endurecimiento | Ya no se acepta Oper falso | Unique index + rechazar si S2S no ata el lead; cron de conciliación |
| `npm audit` critical Next (middleware/proxy + Turbopack + un locale) | C | No es el bug del webhook | Seguir advisory de Next 16.2.x; no ignorar |
| Prisma legacy (`Booking`, seed de tours, `WELCOME10`) | D6 | No corre si nadie hace seed | No sembrar prod; documentar modelos muertos |
| Leaflet en el paquete | D7 | Sólo tours | Quitar al apagar tours |
| Fechas UTC vs America/Panama | D4 | Edge case de “hoy” | `src/lib/dates.ts` |
| Cero tests / CI en `main` | D10 | El primer cobro se prueba a mano | Portar al menos: depósito server-side, `isSafeOper`, amountsMatch, 404 de placeholders |
| Contraste bronce/marfil 3.42:1 | Punto 8 | El CTA se lee; no pasa AA | **Cambio de marca** (ver §4) |
| Controles &lt; 44 px | Punto 7 | El form de pago sí mide 46 px | Traer el parche móvil del bloque 6 |
| `db.ts` no lazy | D6 | El site marketing no lo importa | Igualar a `getDb()` de la rama broker |
| Logs con WhatsApp en claro | calidad | Necesario para debug inicial | Redactar en prod |

Nada de esta tabla sustituye §1. Se puede cobrar el primer abono con CSS sin `next/font`; no se puede cobrar sin DB+PF y sin ver el lead.

---

## 4. Decisiones que le tocan a Mark

No son tickets de código. Un agente no debe “resolverlas” con un valor razonable.

### 4.1 Producto y legal

| # | Decisión | Contexto |
|---|---|---|
| M1 | **Texto legal final** del disclaimer de solicitud a 24 h + reembolso 100 % | Hoy está hardcoded como copy de producto. ¿Va a `/terminos`? ¿Quién firma el reembolso? |
| M2 | **Cómo se devuelve** el abono si no hay cupo | PF void/refund vs transferencia. Plazo. Quién lo ejecuta |
| M3 | **Saldo 70 %** | ¿Sigue el modelo PEX (“24 h antes”)? ¿Lo cobra Atlante, el operador, o se queda fuera del sitio? |
| M4 | **Comisión de Atlante** | El cobro del 30 % es abono al cliente, no necesariamente la comisión. ¿El 30 % es de Atlante, del operador, mixto? La rama broker tenía `ATLANTE_COMMISSION_PCT` PENDIENTE MARK |
| M5 | **Quién confirma en 24 h** con PEX (Ferry 1 / Sirena) y con cada tercero | Nombre, WhatsApp, horario. El admin actual no muestra esas solicitudes |
| M6 | ¿**Reactivar Ferry / Tours** y cuándo? | Sólo con tarifas verificadas. El catálogo fantasma de `tours.ts` no se reusa |
| M7 | ¿Se usa otra vez el **puente a PEX** (`feature/atlante-broker`) para tickets, o este cobro directo es el único camino? | Son dos productos. Mezclarlos sin decisión duplica funnels |

### 4.2 Catálogo y precios

| # | Decisión | Contexto |
|---|---|---|
| M8 | ¿La **matriz PEX 2026-09-09** (ruta × horas × cupo) sigue vigente para Ferry 1 y Sirena? | Si sí, se carga (opción A de §1.2). Si no, WhatsApp hasta nueva lectura (opción B). No inventar 8 h/12 h |
| M9 | Nombre público: **Pacific Ferry 1** vs Pacific Ferry | El brief pide “1”; el MVP lo recortó |
| M10 | **ANA C**: ¿entra a las 11 o se quita del índice? | Hoy está en “Próximamente” |
| M11 | Precios / marina / pax de las **9 terceras** | Fuente o no se publican. El placeholder no debe heredar Marina Flamenco el día que pasen a `live` |
| M12 | Aura sigue fuera (ya está). Confirmar que no se “completa la flota PEX” en silencio | — |

### 4.3 Marca y confianza

| # | Decisión | Contexto |
|---|---|---|
| M13 | Merchant name que verá el cliente en **PagueloFácil** | Ver §1.1 / §1.6 |
| M14 | **Tilde** en Pacífico / Panamá / Atlante del Pacífico | SEO y marca; 08-R6 lo dejaba a Mark |
| M15 | Oscurecer **bronce** (o texto tinta en el botón) para contraste AA | Es un cambio visual de marca, no un fix invisible. Ratios en la auditoría §8 |
| M16 | PNG de **favicon / logo** Atlante | No usar el velero celeste ni regenerar el logo PEX |
| M17 | ¿Se pueden citar reseñas de Google/TripAdvisor de **otro negocio**? | Hoy el home lo hace sin fuente y sin nombrar PEX — peor que nombrar a PEX |
| M18 | Popup **ATLANTE10**: ¿existe el descuento? | Si no hay código real ni email, apagar |
| M19 | Instagram `instagram.com/atlantedelpacifico` y correo `concierge@atlantedelpacifico.com` vs dominio `.lat` | NO ENCONTRADO si están activos; Mark confirma o se quitan del pie |
| M20 | Team slug de Vercel `pacificexperience` en `*.vercel.app` | ¿Se renombra el team o se vive con preview URLs que dicen PEX? |
| M21 | Repo GitHub **público** | Los docs, este reporte y el historial se leen sin login. TODO-mark M01 de la otra rama pedía privado |

### 4.4 Infra

| # | Decisión | Contexto |
|---|---|---|
| M22 | Proveedor Postgres (Neon / Supabase / otro) y si el proyecto “ATLANTE” de Supabase se restaura | Sin esto no hay §1.1 |
| M23 | ¿Sandbox PF primero o prod con $1? | Hay URL de sandbox en `.env.example` |
| M24 | Observabilidad (Sentry u otro) | 08-R6 D9: PENDIENTE MARK; hoy `console.error` |
| M25 | Encender CI (la rama broker tenía Actions; `main` no) | No bloquea el primer cargo si se prueba a mano el checklist §1.7 |

---

## Qué no hay que hacer

- No inventar tarifas para las 9 terceras “para que el grid se vea vivo”.
- No rellenar 8 h/12 h de Ferry/Sirena con un múltiplo del $1,300.
- No dejar `/tours` indexable “un rato” mientras se cobra charters.
- No mergear a `main` ni desplegar este PR (ni ningún otro) sin aprobación explícita de Mark.
- No ajustar el bronce en silencio para pasar Lighthouse.
- No volver a poner un PNG de Pacific Experience en `/public`.
