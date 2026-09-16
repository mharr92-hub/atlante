# Recomendaciones para que `/charters` quede listo para vender

**Fecha:** 2026-09-16  
**Parte de:** auditoría en `docs/reportes/auditoria-charters-grok.md`  
**Regla:** no se inventan tarifas, capacidades, reseñas ni marinas. Si no hay fuente, va `PENDIENTE MARK` / `NO ENCONTRADO`.

Esto no es una lista de bugs. Es el orden en que el sitio puede recibir un abono real **sin mentirle al cliente y sin acreditar pagos de mentira**.

---

## 1. Bloqueante para el primer cobro real

Lo mínimo. Sin esto, no se debería poner tráfico (ni un anuncio, ni un link de WhatsApp masivo) hacia un checkout que cobra.

### 1.1 Tarifas por bloque que Mark confirme por escrito

Hoy el único path que crea un link de PagueloFácil es **4 h de Pacific Ferry o Sirena**, usando `$1,300` sample (`TODO_MARK`) → abono **$390**. El código dice que $1,300 es el “desde” del rango, **no** una tarifa 4 h.

Antes del primer cobro:

- Mark entrega (hoja, mail o Notion — lo que sea **citable** en `src/data/charters.ts`) los totales USD de **4 / 8 / 12 h** para Pacific Ferry **1** y Sirena del Mar, o dice explícitamente “cobren 30% del desde $1,300 mientras tanto”.
- Las 9 naves de terceros **no se cobran** hasta tener el mismo cuadro. Seguir en “Próximamente” está bien; no rellenar “algo razonable”.
- Donde un bloque siga vacío: el botón debe ser cotización WhatsApp, **nunca** un abono inventado. Eso ya ocurre en 8 h/12 h (`depositAmount: 0`). Mantenerlo.

`PENDIENTE MARK` — números. Sin esa tabla, el primer cargo es una apuesta.

### 1.2 Probar la pasarela de verdad, con las credenciales que se van a usar

En este repo el flujo (LinkDeamon → return/webhook → MerchantTransactions) está escrito. **No** se pudo ejecutar contra PF: no hay `PAGUELOFACIL_CCLW` / `PAGUELOFACIL_API_TOKEN` en el entorno del agente.

Checklist operativo (una transacción sandbox o $1 de prueba):

1. `DATABASE_URL` + `npx prisma db push` (o `prisma/charter-requests.sql`) en el proyecto de Vercel.
2. `PUBLIC_APP_URL` = origen real (prod o preview), sin slash final.
3. Vars PF en Vercel (raw token, **sin** `Bearer`).
4. En el dashboard de PF → Notificaciones: `POST {PUBLIC_APP_URL}/api/payments/paguelofacil/webhook`.
5. Una solicitud 4 h de punta a punta: lead en `CharterRequest`, redirect al hosted, pago, vuelta a `/gracias`, fila `paymentStatus=paid`.
6. Un pago cancelado / fallido: lead sigue `unpaid`, copy de “no se completó el pago”.
7. Confirmar **qué nombre ve el cliente en la página de PagueloFácil**. Si sale “Pacific Experience”, es fuga de marca en el paso de pagar. Ver §4.

Sin este ensayo, el primer abono de un desconocido es también el primer test de producción.

### 1.3 Texto legal del disclaimer — versión final, no la del MVP

El copy actual (ES, en `DEPOSIT_DISCLAIMER_ES`) dice: el abono confirma la **solicitud**, no la reserva; verificación en **24 h** por WhatsApp; alternativa de fecha/nave; si no sirve, **100% del abono**.

Está en fichas, index de flota y form. Eso es el modelo correcto.

Falta para cobrar de verdad:

- Mark **firma** ese texto (o manda el párrafo legal). 24 h, reembolso 100%, canal WhatsApp, quién ejecuta el reembolso en PF.
- Una URL pública de política (aunque sea `/legal/abono`) enlazada junto al disclaimer. Cobrar 30% solo con un recuadro en el form es frágil si hay disputa con el banco.
- Alinear CTAs: “Ver y reservar” / H1 “Reservar {nave}” contradicen “solicitud”. Cambiar a “Solicitar” / “Enviar solicitud” cuando se toque copy. No es código de cobro; es no perder un chargeback por expectativa de reserva instantánea.

`PENDIENTE MARK` — texto. El código ya tiene un placeholder honesto.

### 1.4 Apagar precios sin verificar que aún están al público

`/compare` (200) y `/tours/[slug]` (200) publican `$850`, `$1,450`, `$2,800`, charters `$1,200`–`$3,200` de `src/content/tours.ts` **sin fuente**. La home dice que Tours es “Próximamente”; esas URLs no.

Bloqueante de **confianza**, no de la pasarela: un cliente puede llegar por Google, ver un precio, y WhatsApp-earlo como si Atlante lo vendiera.

Hasta que Mark reactive Tours/Ferry con tarifas reales: `notFound()` (o 410) en `/compare` y `/tours/[slug]`, y `disallow` en `robots.ts`. No hace falta borrar el archivo del catálogo.

### 1.5 Infra para no perder el lead ni el pago

- **Postgres en prod.** Sin `DATABASE_URL` no hay link PF (bien) y el lead es un log. No se cobra; tampoco se rescata.
- **Número de solicitud visible** en `/gracias` y en el mensaje de WhatsApp (id corto o los 8 primeros del UUID). Hoy el id existe en JSON/DB y el cliente no lo ve.
- **Cola en admin de `CharterRequest`**, no de `Booking` de tours. Si nadie mira esa tabla, las 24 h son un deseo. Mínimo: lista pending/paid/awaiting + WhatsApp click-to-chat + marcar confirmada/rechazada + nota de reembolso.
- **Quién confirma con el operador en 24 h** tiene que estar nombrado. Eso no es un ticket de código. Ver §4.

### 1.6 Marca en el tab y en URLs públicas

- Favicon actual = vela celeste (`public/favicon.png`), no Atlante. Sustituir por un isotipo **que Mark apruebe**. No improvisar un logo.
- `public/logo.png` (wordmark PEX) se quitó en este PR. No volver a subir assets de Pacific Experience a `public/`.
- Quitar de la home, JSON-LD y footer cualquier **4.9 / 127 reseñas / +200 experiencias** hasta tener cifras reales. Cobrar con prueba social falsa es peor que cobrár sin estrellas.

---

## 2. Importante pero no bloqueante

Antes de pagar ads. Ningún ítem de esta lista inventa prueba social.

### Conversión y confianza

- **Fotos reales de cada nave live.** Hoy la galería es tres veces `og-atlante.jpg`. Una ficha sin la embarcación no cierra un abono de cientos de dólares. `PENDIENTE MARK` — archivos; el markup ya tiene `gallery[]`.
- **Nombre “Pacific Ferry 1”** en cards, H1, metadata y descripción de PF (`CDSC`), si ese es el nombre comercial.
- **Proceso de 3 pasos visible** (elige nave → abono 30% = solicitud → WhatsApp en 24 h). El disclaimer está; un stepper corto encima del form ayuda más que otro párrafo.
- **WhatsApp** ya está (float, hero, gracias, concierge en ficha, `+507 6860 3623`). No hace falta otro widget. Sí hace falta que el deep link de gracias lleve nave + fecha + **número de solicitud**.
- **Testimonios:** no poner Mariana G. / TripAdvisor / “reseñas verificadas” hasta tener reseñas **reales** (Google Business, WhatsApp export, o post-viaje). Si no hay, quitar la sección. Cero estrellas honestas > 4.9 inventado.
- **Popup `ATLANTE10`:** no promete un 10% que el checkout de charters no aplica y que `/api/lead` no persiste. Apagarlo o conectarlo a un cupón real **después** de que Mark diga que existe descuento de lanzamiento.
- **USD explícito junto al abono.** El selector EUR/COP/MXN convierte con tipos fijos; PF cobra dólares. Una línea “El cargo en PagueloFácil es en USD” evita reclamos.
- **Copy “desde $1,300”** en la card: o es tarifa 4 h confirmada, o dice “desde (rango, por confirmar)” sin parecer un precio de lista.

### UX de flota

- Las 9 naves en “Próximamente” están bien. No abrir ficha hasta specs. Quitar **ANA C** del grid o confirmar que entra al lanzamiento (`PENDIENTE MARK`).
- Marina Flamenco no debería vivir en `placeholder()` para terceros. `null` / “por confirmar” hasta cita.

### Operación post-pago (sin esto el 24 h se rompe a mano)

- Plantilla WhatsApp al cliente: “recibimos abono {oper} / solicitud {id} / te confirmamos antes de {deadline}”.
- Plantilla al operador de la nave (PEX para las dos propias; terceros cuando existan).
- Procedimiento de reembolso 100% en PagueloFácil (quién entra al dashboard, SLA).
- Cron o cola de “S2S no confirmó pero el cliente dice que pagó” — el README ya lo señala como TODO portado de catamaran-rentals.

---

## 3. Deuda técnica (No cumple / Parcial que no mata el primer cobro)

Resolver pronto, no el día del anuncio.

| Origen (auditoría) | Deuda | Notas |
| --- | --- | --- |
| 1 No cumple | Citar fuente o `PENDIENTE` en cada campo de `charters.ts`; tipo `pricesAreSample` que se pueda apagar | Hoy `pricesAreSample: true` es literalmente el único valor |
| 1 / 6 | Archivar o 404 `src/content/tours.ts` en rutas públicas; dejar de seed-ear 60 días de cupos de tours | `prisma/seed.ts` |
| 3 Parcial | Mostrar id; no devolver `ok: true` si `persisted === false` cuando el producto ya cobra | UX de “solicitud recibida” sin DB es mentira operativa |
| 3 | Admin `CharterRequest` | El dashboard actual es de `Booking` |
| 4 Parcial | Favicon Atlante; grep visual de `public/` | Copy ya está limpio |
| 5 Parcial | No crear link PF mientras `TODO_MARK`; flag `pricesAreSample` debe cortar cobro, no solo el comentario | Hoy se cobra el sample |
| 7 Parcial | `min-height: 44px` en `.card-link`, `.nav-cta`, `.lang-toggle button`, `.nav-toggle` | El CTA de pago ya mide 46 px |
| 8 Parcial | Contraste: **no tocar colores sin Mark** | Ver §4 |
| SEO | Sacar `AggregateRating` inventado; `noindex` tours/compare | |
| Rendimiento | `next/font` para Inter; `next/image` en galería cuando haya fotos reales | |
| Seguridad | Upgrade `next` (audit critical en 16.2.10) en PR dedicado; rate limit en `reservar`; no loguear WhatsApp en claro | No mezclar con copy |
| Seguridad | `AUTH_SECRET` + `ADMIN_PASSWORD` documentados en `.env.example` (sin valores) | |
| Calidad | Un solo catálogo de flota; FX vivo o solo USD; borrar SVG de create-next-app | |
| Pagos | Si S2S falla, no tragarse el evento para siempre: retry controlado o job de conciliación | El ACK 200 es consciente |

Puntos 2 y 5 de **seguridad de cobro** (re-verificar PF; no fiarse del cliente) **ya están**. No son deuda de implementación; la deuda es operativa (cron, ids, admin).

---

## 4. Decisiones que le tocan a Mark

No son tareas de código. Están marcadas para no disfrazarlas de sprint.

1. **Texto legal final** del abono / 24 h / reembolso 100% / jurisdicción. ¿Se publica en una página Legal?
2. **Comisión 30%:** ¿se queda? ¿El 70% restante cuándo y cómo? ¿IVA / ITBMS?
3. **Quién confirma con el operador en 24 h** (nombre, WhatsApp, horario). ¿Las dos naves propias las confirma PEX por dentro sin que el cliente lo sepa? (marca: el cliente no debe leer “PEX”; ops sí puede).
4. **¿Se cobra ya con el “desde” $1,300** como total 4 h, o se espera la tabla 4/8/12?
5. **Tarifas y specs de las 9 naves** (y si ANA C existe en el lanzamiento). Hasta entonces: no publicar números.
6. **¿Reactivar Ferry / Tours?** Hoy el brief dice que no. Mientras tanto hay que **apagar** las URLs que aún venden precios. Reactivar = nuevas tarifas con fuente, no “prender `ToursSection`”.
7. **Aura** sigue fuera — confirmar que no se cuela en un Excel de flota.
8. **Nombre comercial de Pacific Ferry 1** vs “Pacific Ferry”.
9. **Pasarela a nombre de quién:** merchant PagueloFácil de PEX (temporal, como el pivot) vs cuenta Atlante. Si el hosted page dice Pacific Experience, ¿se acepta para el primer cobro o se espera cuenta propia?
10. **Prueba social real:** ¿existen reseñas de Google/WhatsApp que se puedan citar? Si no, la sección se apaga. No fabricar.
11. **Fotos:** ¿quién entrega galería por nave? ¿Se puede usar material de PEX **sin** su logo en el recorte?
12. **Colores de marca vs AA:** oro `#d7a85b` sobre marfil es 1.97:1 (falla hasta UI). ¿Se oscurece el oro/bronce, o se reserva el oro para fondos oscuros? Eso es identidad, no un “fix de CSS”.
13. **Favicon / isotipo** oficial de Atlante (el “A” del header es un stopgap).
14. **Descuento de lanzamiento:** ¿existe `ATLANTE10` / 10% o el popup miente?
15. **Email** `concierge@atlantedelpacifico.com` vs sitio `.lat` — ¿el buzón existe?
16. **Tráfico pagado:** no invertir hasta 1.1–1.6. Esta línea es decisión de Mark, no del repo.

---

## Orden sugerido (sin calendario)

1. Mark: tabla de precios + disclaimer + quién cubre las 24 h + qué sale en PF.  
2. Código: 404 de tours/compare, quitar reseñas falsas, id de solicitud, admin de `CharterRequest`, no cobrar `TODO_MARK` salvo instrucción.  
3. Ops: env de Vercel + un pago de prueba.  
4. Marca: favicon y fotos.  
5. Ads.

El webhook y el monto en servidor **ya permiten** cobrar sin que un `curl` invente un pagado. Lo que no permite vender en serio es cobrar $390 sobre un sample, mostrar 127 reseñas que no hay, y dejar `/compare` con precios de un catálogo anterior.
