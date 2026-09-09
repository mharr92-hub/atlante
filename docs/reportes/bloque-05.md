# Bloque 5 — R3 · Alianzas y códigos de aliado

Fecha: 2026-09-09 · Rama: `feature/atlante-broker` · Sin push, sin merge, sin deploy, sin tocar Vercel ni Supabase, sin ejecutar migraciones contra ninguna base de datos.

**Estado del bloque: un hotel, una agencia, un organizador o un operador ya pueden recomendar Atlante con su propio enlace, y el reparto sale calculado en el reporte del mes.** No hay ningún aliado dado de alta porque no existe ninguno todavía: la tabla `Reseller` está vacía y el porcentaje del reparto no está decidido (PENDIENTE MARK #1). Del lado de Pacific Experience **no cambia nada**: a PEX le sigue llegando `ref=ATLANTE` y el código del aliado no sale de Atlante.

Commits del bloque (sobre `5579c08`):

| SHA | Sub-bloque |
|---|---|
| `b5f32ae` | Códigos de aliado, migración `0005_partners`, captura por URL, validación contra `Reseller`, reparto en `/admin/comisiones` y alta en `/admin/aliados` (5.1) |
| `000351f` | Materiales comerciales en borrador (5.2) |
| `aa6fc01` | Tests del bloque y humo (5.3) |
| (este) | Reporte |

| Comprobación | Resultado |
|---|---|
| `npm run lint` | limpio (eslint + `check:pex-links`) |
| `npm run test` | **134/134** (113 antes del bloque) |
| `npm run build` | ✓ compila, las mismas 39 rutas del bloque 4 + el proxy |
| `npx tsc --noEmit` | limpio |
| `npx prisma validate` | ✓ |
| Humo sin base de datos (`scripts/smoke-bloque5.mjs`) | ✓ (§7) |

---

## 1. Variables de entorno

**Ninguna nueva.** El bloque no necesita ningún servicio ni secreto que no existiera ya; `.env.example` queda igual. El porcentaje del aliado se guarda por aliado en `Reseller.commissionPercent` (editable en `/admin/aliados`); el de Atlante sigue saliendo del producto, del operador o de `ATLANTE_COMMISSION_PCT`.

**Ninguna dependencia nueva** tampoco.

---

## 2. Qué se hizo, por archivo

### 2.1 Modelo (5.1)

- **`prisma/schema.prisma`**: `Reseller` suma `kind` (`hotel` | `agency` | `organizer` | `operator`, por defecto `hotel`), `whatsapp?` y `notes?`, más un índice por `active`. El resto del modelo se reutiliza tal cual, como pide el bloque: `name`, `email` (único), `referralCode` (único), `commissionPercent`, `active`.
- **`prisma/migrations/0005_partners/migration.sql`**: generada con `prisma migrate diff --from-schema-datamodel prisma/schema.base.prisma --to-schema-datamodel prisma/schema.prisma --script` (la copia del esquema anterior se borró después del diff). **Todo aditivo**: tres columnas y un índice, ninguna columna existente cambia, así que se puede aplicar sobre una base con datos. **No se ejecutó contra ninguna base.**

### 2.2 Captura del código (5.1)

- **`src/lib/partner-codes.ts`** (nuevo, puro): la lógica de los códigos, sin Prisma y sin `server-only`, porque la comparten el proxy (edge), las APIs (servidor), el admin y los tests.
  - `normalizePartnerCode()` — mayúsculas, sin acentos ni espacios, sólo `A-Z0-9._-`, máximo 24 caracteres, mínimo 2. **Descarta `ATLANTE`**: es nuestro propio código en PEX y no pertenece a ningún aliado, así que volver de PEX con `?ref=ATLANTE` pegado en la URL no crea una atribución falsa.
  - `pickPartnerCode()` — el código escrito en el formulario manda sobre el de la cookie.
  - `acceptPartnerCode()` — la regla de aceptación: sólo si existe un `Reseller` **activo** con ese código exacto.
  - `partnerInviteUrl()` — `https://www.atlantedelpacifico.lat/?partner=CODE`.
  - `suggestPartnerCode()` — código sugerido a partir del nombre, para el alta y para aprobar una solicitud.
  - `RESELLER_KINDS` / `RESELLER_KIND_LABEL` — los cuatro tipos del bloque.
- **`src/proxy.ts`** (en Next.js 16 `middleware.ts` está deprecado y se llama `proxy.ts`; la función exportada es `proxy`): además de `?partner=CODE` ahora acepta **`?ref=CODE`** en cualquier ruta de Atlante (`partner` manda si vienen los dos), normaliza el código y **limpia el parámetro de la URL canónica con un 307**, conservando las UTM. La cookie `atl_partner` sigue durando 30 días, sigue sin ser `httpOnly` (el paso 3 del funnel la lee para prellenar el campo) y sigue ganando **la primera visita**.
  - La redirección sólo ocurre en `GET` y `HEAD`: un `POST` (acción de servidor) conserva su URL tal cual.
- **`src/lib/partners.ts`** (nuevo, `server-only`): `resolvePartnerCode()` trae la fila de `Reseller` por código y decide con `acceptPartnerCode()`; `partnerDirectory()` devuelve todos los aliados por código para el reporte. Sin base de datos —o si la consulta falla— devuelven `null` y un mapa vacío: **el código se ignora, el lead se guarda igual y el handoff a PEX no se bloquea** (regla 9).

### 2.3 Leads (5.1)

- **`src/lib/leads.ts`** y **`src/lib/vessel-leads.ts`**: `parse…Input()` sólo **normaliza** el código que llega en el cuerpo; la validación contra `Reseller` ocurre al guardar, dentro del `try` de la escritura, porque necesita la base de datos. El lead guarda `partnerCode` sólo si hay un aliado activo detrás; **un código que no existe, uno desactivado o uno mal escrito se ignoran sin error** y sin cambiar la respuesta de la API.
  - Cambio de comportamiento respecto al bloque 2: antes se guardaba cualquier texto que llegara en el campo. Ahora un código inventado no ensucia el reporte de comisiones.

### 2.4 Reporte de comisiones (5.1)

- **`src/lib/commissions.ts`**: `PaidLead` suma `partnerCode` y aparece `summarizePartnerCommissions()`, que agrupa los leads pagados por aliado y calcula el reparto que fija el bloque:

  ```
  comisión de Atlante = monto × commissionPct   (ya viene guardada en el lead)
  parte del aliado    = monto × Reseller.commissionPercent
  neto de Atlante     = comisión − parte del aliado
  ```

  Los dos porcentajes se aplican **sobre el monto de la reserva**, no uno sobre el otro. Casos que no inventan nada:
  - los leads **sin aliado** caen en una fila `(sin aliado)` con parte 0 y neto = comisión;
  - un aliado con 0 % reparte 0 (es un dato, no un hueco);
  - un código **sin aliado activo que lo respalde** (borrado o desactivado después de la reserva) muestra `—` en las tres columnas del reparto, se cuenta en `unresolved` y **deja el neto total en `—`**: no se afirma un número que no se puede calcular.
- **`src/app/admin/(dash)/comisiones/page.tsx`**: la tabla por producto o nave de siempre + una segunda tabla **"Reparto por aliado"** con aliado, leads pagados, monto, comisión de Atlante, % del aliado, parte del aliado y neto de Atlante. Debajo, el aviso de códigos sin ficha activa con el enlace a `/admin/aliados`.
- **`src/app/admin/(dash)/comisiones/export/route.ts`**: `?group=aliado` devuelve el **CSV por aliado** (`mes, aliado_codigo, aliado, leads_pagados, monto, comision_atlante, pct_aliado, parte_aliado, neto_atlante`, con la fila de total). Sin `group` sigue devolviendo el CSV por producto, con las mismas columnas del bloque 3. La pantalla ofrece los dos botones.

### 2.5 Admin de aliados (5.1)

- **`src/app/admin/partner-actions.ts`** (nuevo): las acciones del bloque, todas con `requireAdmin()`.
  - `saveResellerAction` — alta y edición por `referralCode` (siempre en mayúsculas; escribir un código que ya existe edita ese aliado). Si el correo choca con otro aliado —es único en `Reseller`— no se guarda y no revienta.
  - `toggleResellerAction` / `deleteResellerAction` — activar, desactivar y borrar. Desactivar es lo recomendado: los leads guardan `partnerCode` como texto y el borrado deja su reparto en `—`.
  - `approvePartnerApplicationAction` — **aprobar crea la ficha que toca**: `kind = operator` → `Operator` (para poder colgarle naves en `/admin/naves`); `hotel`, `agency` u `organizer` → `Reseller` con código libre derivado del nombre (`HOTELX`, `HOTELX2`, …) y **0 % de comisión**. Es idempotente: si la ficha ya existe no la pisa, sólo mueve el estado a `approved`.
  - `setPartnerStatusAction` y `deletePartnerApplicationAction` se **movieron** aquí desde `vessel-actions.ts` (que se queda con operadores y naves).
- **`src/app/admin/(dash)/aliados/page.tsx`**: dos secciones.
  - **Códigos de aliado**: código, nombre y tipo, contacto, comisión (con `sin fijar` en rojo cuando es 0), **enlace de invitación con botón "Copiar"**, estado y acciones. La cabecera explica de una vez que el código dura 30 días, viaja en el lead y **no llega a PEX**.
  - **Nuevo código**: código, nombre, tipo (los cuatro), correo, WhatsApp, comisión, notas internas y activo.
  - **Solicitudes**: la tabla del bloque 4 con el botón **Aprobar** delante de los cambios de estado sueltos, y el aviso de que aprobar no publica ninguna ficha.
- **`src/components/admin/CopyField.tsx`** (nuevo, cliente): el enlace con su botón "Copiar", por el mismo camino que la pantalla `/listo` (`navigator.clipboard` y, si el navegador no da permiso, un `<input>` invisible con `execCommand`).
- **`src/app/globals.css`**: `.admin-copy` (enlace + botón, que se parte en dos líneas en móvil) y `.admin-warn-inline` (el "sin fijar"). Nada del sistema de diseño público se tocó en este bloque.

### 2.6 Materiales comerciales (5.2)

Tres borradores nuevos en **`docs/comercial/`**, los tres con el encabezado **BORRADOR — revisar Mark**, los tres sin citar ninguna ley y los tres con los números que no existen escritos como `______`:

| Archivo | Contenido |
|---|---|
| `contrato-comision-operador.md` | Objeto (intermediación: Atlante no opera, no presta y no cobra), alcance de la publicación, comisión y forma de pago (**mensual contra factura**, con ventana de atribución, plazo de observación y trato de cancelaciones y reembolsos), obligaciones del operador (licencia de la autoridad marítima, seguro vigente, tripulación habilitada, **precio igual al público**, respuesta, información veraz), obligaciones de Atlante, **datos que se comparten** (nombre, WhatsApp, correo, fecha, jornada, personas, ocasión e id del lead — y nada de pago, porque Atlante no lo recoge), marca, duración y terminación, independencia de las partes, notificaciones, firmas y anexo de embarcaciones. Cierra con la tabla de lo que falta decidir. |
| `kit-operador.md` | Las 13 cosas obligatorias para publicar una nave (con **mínimo 8 fotos**, capacidad, marina, rutas, incluye / no incluye, políticas, WhatsApp, licencia y seguro), el formato exacto de la **tabla de precios por ruta / jornada / tramo de capacidad** con la advertencia de que un tramo sin precio se publica como "consúltanos" y no como un número inventado, los requisitos de las fotos, los datos de facturación, cómo funciona el flujo después de publicar y lo que Atlante **no** hace. |
| `propuesta-hoteles.md` | Cómo funciona el código en cinco pasos con el enlace real `…/?partner=TUCODIGO`, qué gana el hotel, **ejemplo con los números en blanco**, cómo se liquida, qué se registra de los huéspedes (el código y la campaña; nunca nombre, correo o teléfono en una URL) y las preguntas que siempre salen. |

Cada uno termina con una tabla "Notas para Mark" que no va en el documento que se manda.

### 2.7 Tests y humo (5.3)

- **`tests/partners.test.ts`** (nuevo, 21 casos) — §3.
- **`scripts/smoke-bloque5.mjs`** (nuevo): el humo del §7, fuera de `lint`, `build` y `test`, como los de los bloques 3 y 4.

---

## 3. Tests

`npm run test` pasó de 113 a **134 casos**. Los 21 nuevos están en `tests/partners.test.ts`:

| Grupo | Qué asegura |
|---|---|
| Normalización (5) | `hotelx`, `  hotel x  ` y `Hotél-X` dan `HOTELX` / `HOTEL-X`; lo que no puede ser un código se descarta; **`ATLANTE` no es un aliado** pero `ATLANTE-VIP` sí; un código larguísimo se recorta a 24; **el código del formulario manda sobre el de la cookie** |
| Validación contra `Reseller` (5) | **cookie de partner → el lead se guarda con ese `partnerCode`**; **un código inactivo se ignora sin error**; uno que no existe también; la fila de otro aliado nunca valida el código pedido; sin código no hay aliado aunque la fila exista |
| Enlace e identidad (4) | El enlace de invitación es el dominio `.lat` con `?partner=CODIGO` y no duplica la barra; sin código válido cae a la home en vez de a una URL rota; el código sugerido sale del nombre sin acentos; los cuatro tipos del bloque están en el modelo |
| **Reparto de comisión (7)** | Los dos porcentajes se aplican sobre el monto (1.000 × 20 % = 200 de Atlante, 1.000 × 5 % = 50 del aliado, **neto 150**); los leads sin aliado no reparten y el neto es la comisión entera; cada aliado agrupa sus leads y el total cuadra (3.600 de monto → 720 de comisión, 275 de aliados, **445 netos**); un aliado al 0 % reparte 0; **un código sin aliado activo no inventa reparto y deja el neto total en `—`**; el reparto redondea a centavos; sin leads pagados todo es cero |

`src/lib/partners.ts`, `src/lib/leads.ts` y `src/lib/vessel-leads.ts` son `server-only` (Prisma + `next/headers`) y el runner de Node no los puede cargar, igual que en los bloques anteriores. Lo que se probó es **la lógica que ellos ejecutan**: la consulta a Prisma sólo trae la fila y la decisión la toma `acceptPartnerCode()`, que es la función probada. El camino completo se ejercita en el humo del §7 y en las pruebas con base de datos del §8.

---

## 4. Qué no se hizo

- **No se ejecutó ninguna migración.** `0005_partners` está escrita y verificada contra el esquema, pero no se aplicó a ninguna base: no hay Postgres propio en esta máquina y la regla 1 prohíbe correrla contra la remota. `npm run db:seed` tampoco se corrió.
- **El camino con base de datos no se probó en vivo**, por lo mismo: la validación contra `Reseller`, el alta manual, el aprobado de una solicitud y las dos tablas de `/admin/comisiones` **necesitan Postgres**. Lo que sí está probado entero es el camino sin base de datos, que es el estado de hoy, más la lógica pura de los dos (§3). El §8 deja la lista de comprobaciones para cuando la base exista.
- **No hay ningún aliado dado de alta.** `Reseller` está vacío y no se sembró ninguno: no existen aliados reales y la regla 3 prohíbe inventarlos. Mientras la tabla esté vacía, **cualquier código que llegue por URL se ignora**: la cookie se guarda y se limpia la URL, pero el lead sale sin `partnerCode`.
- **No se tocó nada del sitio público.** `/aliados` y `/aliados/registro` quedan como los dejó el bloque 4; el campo "código de aliado" del paso 3 del funnel también. El bloque 5 no pide páginas nuevas.
- **No se añadió "organizador" al formulario público** de `/aliados/registro`, que sigue ofreciendo operador, hotel/concierge y agencia. El tipo existe en `Reseller` y se asigna desde el admin (§5.6).
- **No se tocó PEX** ni se implementó nada del anexo X1–X9. El bloque entero es del lado de Atlante, por diseño: PEX sólo conoce `ref=ATLANTE`.
- **No se instaló ninguna dependencia.**
- **No hay portal del aliado.** Un hotel no puede entrar a ver sus números: los ve Mark en `/admin/comisiones` y se los manda. No estaba en el bloque.
- **No se automatizó la liquidación.** El CSV por aliado es lo que se pega en Sheets; la factura y el pago son manuales, como dice el contrato borrador.

---

## 5. Decisiones tomadas por ambigüedad (regla 12)

1. **La lógica del código vive en dos archivos, no en `lib/partner.ts`.** El TODO (T54) nombra un `lib/partner.ts`; el proxy corre en el edge y no puede importar Prisma, así que quedó `lib/partner-codes.ts` (puro, lo importa el proxy y lo prueban los tests) y `lib/partners.ts` (`server-only`, el que consulta). Es el mismo patrón de `attribution-cookies.ts` / `attribution.ts` del bloque 2.
2. **La URL se limpia con un 307, no con un 308.** Un `?partner=` no es una URL que se haya movido para siempre: es un parámetro de campaña que se consume una vez. Con 307 el enlace del hotel sigue funcionando igual la próxima vez y no queda cacheado en el navegador de nadie.
3. **Sólo se redirige en `GET` y `HEAD`.** Las acciones de servidor de Next.js hacen `POST` a la URL de la página; redirigirlas rompería el admin. Después de la primera navegación el parámetro ya no está en la URL, así que en la práctica no se cruzan.
4. **Manda la primera visita, no la última.** Es la regla que ya aplicaba el bloque 2 a las UTM y al `partner`, y no se cambió: si alguien entró hace 20 días por el enlace del Hotel X y hoy entra por el de la Agencia Y, la reserva es del Hotel X durante 30 días. La alternativa (último contacto) es una línea en `src/proxy.ts` y está anotada en `propuesta-hoteles.md` para que Mark decida.
5. **`ATLANTE` se descarta como código de aliado.** Es el código que Atlante usa en PEX; si alguien vuelve de PEX con `?ref=ATLANTE` pegado en la URL, eso no es una recomendación de nadie. Un aliado que se llame `ATLANTE-VIP` sí es válido.
6. **`?ref=` se acepta en todas las rutas de Atlante**, no sólo en la home: el bloque dice "en rutas de Atlante" y el proxy ya cubre todo menos las APIs y los estáticos. Un hotel que enlace a `/charters?ref=HOTELX` no debería perder su código.
7. **El código se valida al guardar, no al parsear.** `parseLeadInput()` es la función que decide qué respuesta da la API; meter ahí una consulta a Postgres significaría que un fallo de la base cambia el 200 en 400. Validar dentro del `try` de la escritura mantiene la regla 9: si la base no está, no hay lead **ni** código, pero la persona llega igual a PEX con `ref=ATLANTE`.
8. **Un código que no resuelve se ignora en silencio, sin avisar a quien lo escribió.** El bloque lo pide así ("si no existe, lo ignora sin error"), y además evita convertir el campo en un oráculo de qué códigos existen.
9. **El reparto es una segunda tabla, no una columna de la primera.** El bloque pide "columna aliado y reparto"; una columna de aliado en la tabla por producto obligaría a agrupar por (producto × aliado) y a multiplicar las filas. Las dos tablas comparten el mismo mes y los mismos leads, y hay un CSV para cada una.
10. **Un código sin aliado activo deja el neto total en `—`** en vez de sumar su comisión como si no hubiera reparto. Es la regla 3 aplicada al reporte: no se afirma un número que no se puede calcular. La pantalla dice cuántos códigos están en esa situación y cómo arreglarlo.
11. **El correo sigue siendo obligatorio en el alta.** `Reseller.email` ya era `@unique` y no nulo; hacerlo opcional habría cambiado una columna existente, y la migración dejaría de ser puramente aditiva. Un aliado sin correo se da de alta con un correo de contacto cualquiera y su WhatsApp en el campo nuevo.
12. **Aprobar una solicitud crea la ficha con 0 % de comisión.** No hay reparto por defecto acordado (PENDIENTE MARK #1) y la regla 3 prohíbe inventar uno. El 0 % se ve en rojo como `sin fijar` en la tabla de aliados.
13. **Aprobar es idempotente y no pisa fichas existentes.** Aprobar dos veces la misma solicitud no duplica el aliado ni le cambia el porcentaje que Mark ya haya puesto.
14. **Borrar un aliado es un borrado real**, como borrar una nave: los leads guardan `partnerCode` como texto y no se rompen, pero su reparto pasa a `—`. Por eso la pantalla ofrece **desactivar** primero, que es lo que corta la atribución sin perder el histórico.
15. **`setPartnerStatusAction` y `deletePartnerApplicationAction` se movieron** de `vessel-actions.ts` a `partner-actions.ts`: las solicitudes de aliado ya no son un apéndice del marketplace.
16. **Los tres materiales comerciales no citan ninguna ley**, tal como pide el bloque, y lo dicen explícitamente en sus notas: la sesión de código no puede verificar qué normas aplican en Panamá, así que el borrador se limita a lo que las partes acuerdan entre ellas.
17. **`scripts/smoke-bloque5.mjs`** queda en el repo, como los de los bloques 3 y 4: es el humo del §7 y no entra en `lint`, `build` ni `test`.

---

## 6. Qué cambia para quien ya usaba el sitio

| Antes (bloques 2–4) | Ahora |
|---|---|
| `?partner=CODE` guardaba la cookie y **el parámetro se quedaba en la URL** | El parámetro se limpia con un 307; la URL que se comparte y la que ve Analytics es la canónica |
| `?ref=CODE` no hacía nada | Es un segundo nombre del mismo parámetro |
| El código se guardaba **tal cual lo escribieran**, en el lead | Se normaliza a mayúsculas y **sólo se guarda si hay un `Reseller` activo detrás** |
| `/admin/comisiones` tenía una tabla y un CSV | Dos tablas y dos CSV (por producto y por aliado) |
| `/admin/aliados` era la bandeja de solicitudes | Bandeja de solicitudes **+ códigos de aliado con su enlace de invitación**, y el botón Aprobar crea la ficha |

---

## 7. Cómo probarlo

```bash
npm install
npm run lint     # eslint + check:pex-links
npm run test     # 134 casos
npm run build
npx prisma validate
```

### Humo sin base de datos (corrido en esta sesión)

Con `npm run build && npx next start -p 3012` y **sin `DATABASE_URL`**:

```bash
node scripts/smoke-bloque5.mjs http://localhost:3012
```

| Comprobación | Resultado |
|---|---|
| `/?partner=HOTELX` | **307 → `/`**, `atl_partner=HOTELX` |
| `/?partner=hotelx` | 307 → `/`, `atl_partner=**HOTELX**` (mayúsculas) |
| `/tours?ref=agenciay` | 307 → `/tours`, `atl_partner=AGENCIAY` |
| `/?partner=HOTELX&ref=AGENCIAY` | 307, `atl_partner=HOTELX` (`partner` manda) |
| `/?ref=ATLANTE` | 307, **sin cookie de aliado** |
| `/tours?partner=HOTELX&utm_source=meta&utm_campaign=lanzamiento` | 307 → **`/tours?utm_source=meta&utm_campaign=lanzamiento`**: se va el código, se quedan las UTM |
| … cookie `atl_partner` | `Max-Age=2592000` (30 días) y **sin `HttpOnly`** |
| `/?partner=OTRO` con `atl_partner=HOTELX` ya puesta | 307 y **la cookie no se reescribe** (gana la primera visita) |
| `/tours` sin parámetros | **200**, no redirige |
| `POST /api/leads` (nave `aura`, 15 pax, 4 h) con `partnerCode: "NOEXISTE"` y cookie `atl_partner=TAMPOCO` | **200**; `destinationUrl` con `ref=ATLANTE` y **sin** `name`, `email`, `phone`, `nombre`, `correo` ni `telefono`: **el código de aliado no bloquea el handoff** |
| `/admin/aliados`, `/admin/comisiones`, `/admin/comisiones/export?group=aliado` sin cookie | **307** al login |

### Verificación de la regla 15

| Búsqueda en `src/` | Resultado |
|---|---|
| `atlantedelpacifico.com`, `ATLANTE10`, `Pocos cupos`, `127 rese`, `aggregateRating`, `sunset` (sin distinguir mayúsculas) | **0** |
| `stripe / paguelo / yappy / card_number` | **0** |
| `850 / 1450 / 2800 / 1800 / 3200` como precio | **0** |
| `1200` | sólo el ancho de la imagen OG en `layout.tsx` y en la ficha de producto, igual que en los bloques 2, 3 y 4 |
| `pacificexperience.lat` fuera de `lib/pex.ts`, `content/catalog.ts` y `content/vessels.ts` | **0** (`npm run check:pex-links`) |

---

## 8. Lo que falta probar (necesita base de datos)

Con un Postgres **local** (nunca el remoto):

```bash
# .env.local → DATABASE_URL y DIRECT_URL apuntando a una base local vacía
npx prisma migrate deploy
npm run db:seed
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script    # debe salir vacío
```

Y sobre esa base:

1. **Alta**: en `/admin/aliados` crear `HOTELX` (Hotel X, tipo hotel, 5 %). El enlace de invitación tiene que salir como `https://www.atlantedelpacifico.lat/?partner=HOTELX` y el botón "Copiar" debe dejarlo en el portapapeles.
2. **Código válido**: entrar por `…/?partner=HOTELX`, completar el funnel de un tour y comprobar que el lead queda con `partnerCode = "HOTELX"` y que aparece como `aliado: HOTELX` en `/admin/leads`.
3. **Código en minúsculas**: entrar por `…/?partner=hotelx` y comprobar que el lead también sale con `HOTELX`.
4. **Código inactivo**: desactivar `HOTELX`, repetir el funnel y comprobar que **el lead sale sin aliado** y que la API responde 200 igual.
5. **Código inexistente**: entrar por `…/?partner=NOEXISTE`, completar el funnel y comprobar lo mismo.
6. **Escrito a mano**: dejar la cookie con `HOTELX` y escribir `AGENCIAY` en el campo del paso 3: manda el escrito.
7. **Reparto**: marcar pagado un lead de `HOTELX` con monto 1.000. En `/admin/comisiones` la fila del Hotel X tiene que decir comisión 200, % aliado 5, parte 50 y **neto 150**; el CSV `?group=aliado` tiene que traer los mismos números.
8. **Código huérfano**: borrar `HOTELX` con un lead pagado suyo y comprobar que su fila muestra `—` en las tres columnas, que sale el aviso de "1 código sin ficha activa" y que **el neto total queda en `—`**.
9. **Aprobar una solicitud de hotel**: enviar `/aliados/registro` como hotel y aprobarla en `/admin/aliados`; tiene que aparecer un `Reseller` con código derivado del nombre, 0 % y `sin fijar` en rojo. Aprobar dos veces no debe duplicarlo.
10. **Aprobar una solicitud de operador**: la misma prueba con tipo operador; tiene que aparecer en `/admin/operadores` (y **no** una nave: la ficha se sigue creando a mano).
11. **Colisión de código**: dos aliados con nombres que empiecen igual tienen que recibir `NOMBRE` y `NOMBRE2`.
12. **Colisión de correo**: dar de alta un segundo aliado con un correo ya usado no debe guardar nada ni romper la pantalla.

---

## 9. PENDIENTE MARK

| # | Tema | Detalle y qué hay que decidir |
|---|---|---|
| 1 | **Reparto por defecto con los aliados** | Es la decisión que bloquea el bloque entero (decisión #2 del PRD). Hoy cada `Reseller` nace con **0 %** y el reparto sale en cero: el código funciona, atribuye y reporta, pero no reparte. Hace falta el número —y si es el mismo para hoteles, agencias y organizadores— para poder firmar con alguien. |
| 2 | **Primer contacto o último contacto** | La atribución la gana el **primer** aliado que trajo a la persona, durante 30 días. Si dos hoteles se pelean un huésped, gana el primero. Cambiarlo a último contacto es una línea en `src/proxy.ts` (§5.4). |
| 3 | **Ventana de 30 días** | Es la que fija el PRD 5.9 y la que dice `propuesta-hoteles.md`. Si el acuerdo comercial dice otra cosa, se cambia en `ATTRIBUTION_MAX_AGE` (`src/lib/attribution-cookies.ts`) y en el documento. |
| 4 | **Revisión legal de `contrato-comision-operador.md`** | El borrador **no cita ninguna ley** a propósito. Faltan además la razón social y el RUC de la entidad que factura (decisión #7 del PRD), el porcentaje, la ventana de atribución en días y los plazos de liquidación y de preaviso. |
| 5 | **Carta de una página para hoteles** | `propuesta-hoteles.md` la menciona como paso 3 de "Cómo empezamos" y **no existe**: el único documento borroneado es el de operadores, que es otro caso (ellos operan y cobran; el hotel sólo recomienda). |
| 6 | **Formulario público sin "organizador"** | `/aliados/registro` ofrece operador, hotel/concierge y agencia; el tipo `organizer` existe en el modelo y se asigna desde el admin. Si quieres captarlos por la web, hay que añadir la cuarta propuesta a `/aliados` y la cuarta opción al formulario. |
| 7 | **Portal del aliado** | Un hotel no puede consultar sus propios números: hoy los ve Mark y se los manda. Si hace falta, es una ruta nueva con su propia autenticación (no estaba en el bloque). |
| 8 | **QR impreso para hoteles** | `propuesta-hoteles.md` lo ofrece; falta decidir quién lo produce. El enlace ya está listo para generarlo. |
| 9 | **Aplicar las migraciones** | `0001_init`, `0002_broker_v2`, `0003_catalog`, `0004_charters` y ahora `0005_partners` están escritas y **no ejecutadas**. `0005` es puramente aditivo. Antes de `prisma migrate deploy` hay que restaurar el proyecto Supabase "ATLANTE" (decisión #10 del PRD). |
| 10 | **Dar de alta los primeros aliados** | Hasta que exista al menos un `Reseller` activo, **todo código que llegue por URL se ignora**: la cookie se guarda, la URL se limpia y el lead sale sin aliado. Es el comportamiento correcto (no se atribuye a quien no existe), pero conviene saberlo antes de mandar el primer enlace de invitación. |
