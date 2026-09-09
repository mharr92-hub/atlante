# Atlante del Pacífico como broker/revendedor de Pacific Experience — análisis y plan de mejoras

Fecha: 2026-09-09 · Fuentes: recorrido en vivo de atlantedelpacifico.lat y pacificexperience.lat (home, fichas, comparador, checkout). Todo lo que no pude verificar está marcado NO VERIFICADO / NO ENCONTRADO.

> Nota (sesión 2, mismo día): este documento es el análisis original. Los puntos D7 y D8 quedaron resueltos al revisar el repo (ver `02-PRD-atlante-v2.md`, sección "Auditoría del repo").

## 1. Resumen en cinco líneas

Atlante hoy es una landing bonita con datos de relleno: precios irreales ($850–$2,800 por persona), 127 reseñas y testimonios que no existen, canonical y sitemap apuntando a un dominio muerto (.com) y todo cierra en WhatsApp. Para convertirlo en broker de PEX hacen falta tres cosas: (1) limpiar lo que hoy es falso o roto, (2) montar el portal de ticketería PEX con el flujo de 3 clics y una atribución real de comisión, y (3) montar el listado de charters como marketplace con naves de PEX y de terceros. La pieza más valiosa que ya existe es que el checkout de PEX es parametrizable por URL (`/tours/checkout?slot_id=&trip_id=&date=`) y ya tiene un campo "Código de referido": el handoff se puede hacer casi sin tocar PEX.

Un punto honesto sobre el modelo: la "comisión" de PEX a Atlante es dinero que pasa de un bolsillo tuyo al otro. El valor real de Atlante está en (a) capturar demanda que PEX no capta (segunda marca en buscadores, en anuncios y en el mundo "broker/comparador"), (b) ganar comisión real sobre charters de terceros, y (c) ser el paraguas de alianzas con hoteles, concierges y operadores. Las recomendaciones están ordenadas con esa lógica.

## 2. Diagnóstico del sitio actual (lo que hay que arreglar antes de vender nada)

| # | Hallazgo | Evidencia observada | Impacto | Acción |
|---|---|---|---|---|
| D1 | Canonical, robots.txt y sitemap apuntan a atlantedelpacifico.com | `<link rel=canonical>` = atlantedelpacifico.com/...; robots.txt → `Sitemap: https://atlantedelpacifico.com/sitemap.xml`; sitemap lista URLs .com; el .com NO resuelve (DNS_PROBE) | Crítico: Google puede desindexar el .lat por señalar a un dominio inexistente | Cambiar `metadataBase`/canonical/sitemap/robots a https://www.atlantedelpacifico.lat (o comprar el .com y redirigir 301 al .lat) |
| D2 | Email de contacto en dominio inexistente | concierge@atlantedelpacifico.com | Leads perdidos | Usar un buzón real (p.ej. concierge@atlantedelpacifico.lat o el Gmail del negocio) y probarlo |
| D3 | Precios de relleno | Travesía atardecer "desde $850 por persona"; Taboga "$1,450 pp"; Las Perlas "$2,800 pp"; charters $1,200/$1,800/$3,200 | Destruye credibilidad; PEX vende el tour bahía a $25 pp y el Aura desde $1,300 | Reemplazar por precios reales de PEX y de cada operador aliado; paridad de precio con PEX obligatoria (el cliente paga en PEX) |
| D4 | Prueba social inventada | "Google 4.9 · 127 reseñas · +200 experiencias · 14 min respuesta"; 3 testimonios con nombres y etiquetas Google/TripAdvisor | Riesgo legal (publicidad engañosa, ACODECO) y de reputación si un cliente lo verifica | Quitar todo; mostrar sólo reseñas reales (PEX tiene 5.0 · 9 reseñas en Google) citando la fuente, o nada hasta tenerlas |
| D5 | Urgencia falsa | Badge "Pocos cupos esta semana" en las 3 tarjetas de tours | Mismo riesgo que D4 | Sustituir por cupos reales del feed de PEX ("28 cupos · 18/09") o eliminar |
| D6 | Capacidad placeholder | /compare: "12 personas" en los 6 productos | Comparador inútil | Alimentar desde catálogo real (Aura hasta 35, Sirena 30–80, etc.) |
| D7 | Widget de reserva "fantasma" | Ficha de tour: contador de invitados, total, "Depósito 30%", fecha/nombre/email → POST a `/api/bookings`. Destino del dato NO VERIFICADO (no envié el formulario) | El cliente cree que reserva y no hay pago ni confirmación | Convertirlo en el paso 1–3 del flujo de reventa (sección 4) que termina en el checkout de PEX |
| D8 | Formulario de contacto sólo abre WhatsApp | Botón "Enviar por WhatsApp"; existe `/api/lead` en el bundle (persistencia NO VERIFICADA) | Sin CRM ni seguimiento | Guardar cada lead en Supabase (tabla `leads`) y además abrir WhatsApp |
| D9 | Charters viven bajo /tours/ | /tours/charter-atardecer-privado, /tours/yate-completo-taboga… | Confunde SEO y navegación | Separar rutas: /tours/… (reventa PEX) y /charters/… (marketplace de naves) |
| D10 | Sin analítica ni píxel | `window.dataLayer` y `fbq` ausentes | No se puede medir ni atribuir | GA4 + Meta Pixel con tracking cross-domain hacia pacificexperience.lat |
| D11 | Sin páginas legales | Footer sin términos, privacidad, política de cancelación, razón social | Requisito para pasarelas, ads y confianza | Términos, privacidad, "Cómo funciona / quién cobra", política de cancelación (heredada de PEX o del operador) |
| D12 | Selector USD/EUR/COP/MXN | Conversión en cliente; el pago en PEX es en USD | Expectativa falsa de cobro en otra moneda | Mantener sólo como "referencia aproximada" o quitar |
| D13 | Sin hreflang / EN incompleto | Botón EN existe; sin `<link rel=alternate hreflang>` | SEO bilingüe débil | hreflang es/en y rutas /en/… |
| D14 | Contenido de destinos sin páginas propias | Taboga, Las Perlas, Bahía son sólo tarjetas | Se pierde SEO de destino (donde un broker gana) | Páginas /destinos/taboga, /destinos/las-perlas, /destinos/bahia con "todas las formas de ir" (ferry, tour, charter) |

## 3. Arquitectura propuesta: dos portales bajo una marca

| Portal | Qué vende | Quién cobra | Dónde gana Atlante | Rutas propuestas |
|---|---|---|---|---|
| Ticketería (reventa PEX) | Ferry Taboga, Tour por la Bahía, Party en la Bahía (Sirena del Mar) y cualquier tour nuevo de PEX | Siempre PEX (Yappy / PagueloFácil en pacificexperience.lat) | Comisión interna por `referral_code=ATLANTE` + captura del lead antes del pago | /tours, /tours/[slug], /ferry, /reservar/[slug] (3 pasos) |
| Reservas de naves (marketplace de charters) | Aura, Pacific Ferry 1, Sirena del Mar (PEX) + naves de operadores aliados | PEX para sus naves (deep-link a `/charter/checkout?vessel=…`); el operador para las suyas; Atlante factura comisión al operador | Comisión real 10–20 % sobre terceros; comisión interna sobre PEX | /charters, /charters/[slug], /charters/comparar, /cotizar |
| Capa común | Destinos, guías, comparador, blog, "Cómo funciona", alianzas | — | SEO de broker/comparador que PEX no puede hacer sin canibalizarse | /destinos/[slug], /como-funciona, /aliados, /blog |

Regla de oro: Atlante nunca cobra al cliente final. Así no necesita pasarela, no asume responsabilidad de operador ante ACODECO y el texto legal es simple ("Atlante es agente/representante autorizado; la reserva y el pago se procesan con el operador").

## 4. Portal de ticketería PEX — flujo de 3 clics

### 4.1 Cómo se ve para el cliente

| Clic | Pantalla en Atlante | Qué captura | Qué muestra |
|---|---|---|---|
| 0 | /tours (catálogo PEX) | — | Tarjetas con precio real, duración, próxima salida y cupos reales; banda "Agente autorizado de Pacific Experience" |
| 1 | Elegir tour | `trip_id` | Ficha: fotos, itinerario, incluye, políticas de PEX |
| 2 | Fecha + salida + cantidad | `date`, `slot_id`, `pax` (y categorías adulto/niño/jubilado) | Calendario con fechas reales del feed de PEX y cupos por salida |
| 3 | Datos | nombre, email, teléfono, checkbox políticas | Resumen + "Pagar en Pacific Experience" (explicación de un renglón: "Serás redirigido al checkout seguro de PEX; el cobro lo hace PEX") |
| → | Redirección | — | `https://www.pacificexperience.lat/tours/checkout?trip_id=…&slot_id=…&date=…&tickets=N&ref=ATLANTE&h=<token>&utm_source=atlante` |

El cliente llega al checkout de PEX con todo prellenado y sólo confirma y paga. Atlante ya guardó el lead (nombre, WhatsApp, tour, fecha) para seguimiento si abandona. Los datos personales no viajan en la URL: Atlante crea un registro `handoff` con un token de un solo uso (expira en 30 min) y PEX lo consulta servidor-a-servidor (`GET atlante/api/handoff/<token>`) para prellenar nombre, correo y teléfono. Así no quedan datos personales en logs, analítica ni historial del navegador.

### 4.2 Lo que hay que construir en cada lado

| Lado | Cambio | Detalle técnico | Esfuerzo |
|---|---|---|---|
| PEX | Feed público de catálogo y disponibilidad | Endpoint sólo lectura, p.ej. `GET /api/public/trips` (id, nombre, precio, duración, capacidad, políticas) y `GET /api/public/slots?trip_id=&from=&to=` (fecha, hora, cupos, precio). Cache 60 s. Sin datos personales | 1 día |
| PEX | Checkout acepta prellenado por URL + token | Leer `tickets`, `ref` y `h` en `/tours/checkout` y `/charter/checkout`; con `h` consulta el handoff en Atlante y prellena nombre/correo/teléfono; `ref` rellena el campo existente `referral_code` (hoy sólo manual, NO VERIFICADO que acepte URL) | 1 día |
| PEX | Persistir origen en la reserva | Guardar `referral_code` y `utm_*` en la reserva; cookie de 30 días para que si el cliente vuelve directo, la comisión se conserve | Medio día |
| PEX | Webhook de confirmación | Al confirmarse el pago con `referral_code=ATLANTE`, POST firmado a Atlante (`/api/pex/booking-confirmed`) con id, monto, tour, fecha (sin datos de tarjeta) | Medio día |
| PEX | Página de éxito con evento cross-domain | Disparar `purchase` en GA4/Meta con el `client_id` recibido por linker | Medio día |
| Atlante | Catálogo sincronizado | Cron (Vercel) que lee el feed de PEX y actualiza tabla `products` en Supabase (`source='pex'`); fallback al último snapshot si PEX no responde | 1 día |
| Atlante | Flujo /reservar/[slug] en 3 pasos | Estado en URL (`?date=&slot=&pax=`) para que el cliente pueda volver atrás; validación de cupos contra el feed antes de redirigir | 2 días |
| Atlante | Tabla `leads` + notificación | Guardar lead al paso 3 y avisar por WhatsApp/Email al concierge; estado `redirigido → pagado` cuando llega el webhook | 1 día |
| Atlante | Tracking | GA4 con `linker` hacia pacificexperience.lat; Meta Pixel; evento `redirect_to_pex` | Medio día |
| Ambos | Reporte de comisiones | Vista mensual: reservas con `referral_code=ATLANTE`, monto, comisión %; exportable a Sheets | 1 día |

### 4.3 Catálogo PEX a listar (precios observados hoy en pacificexperience.lat)

| Producto | Precio observado | Datos clave | Deep-link objetivo |
|---|---|---|---|
| Ferry a Isla Taboga (boleto abierto) | Adulto nacional desde $10 por tramo · turista $12 entre semana / $15 fin de semana · niño y jubilado $8 · entrada puerto $1 | Sin hora fija, válido 180 días; salidas 5:45 AM – 3:35 PM desde Isla Perico | URL del checkout de ferry NO VERIFICADA (botón "Comprar boleto") |
| Tour por la Bahía (Pacific Ferry 1) | $25 por persona | 1 h 30 min; salidas 5:30–7:00 PM y 8:00–9:30 PM; fechas vie/sáb/dom desde 18/09/2026; fee de puerto incluido | `/tours/checkout?slot_id=&trip_id=&date=` (verificado) |
| Party en la Bahía — Sirena del Mar | Desde $35 por persona | 2 h 30 min; vie · sáb 7:00–9:30 PM; 30 a 80 personas; DJ, bebida de bienvenida, barra de pago | `/tours/c0d1a003-0000-4000-8000-000000000085` → checkout |
| Chárter Aura | Barco completo desde $1,300 · desde $55/persona | Hasta 35 personas; 4h · 8h · 12h; Marina Flamenco; apartado 30 % | `/charter/checkout?vessel=aura` (verificado en enlace) |
| Chárter Pacific Ferry 1 / Sirena del Mar | NO ENCONTRADO en la ficha (páginas /charter/pacific-ferry-1 y /charter/sirena-del-mar existen; precios no revisados) | — | `/charter/checkout?vessel=pacific-ferry-1` / `?vessel=sirena-del-mar` (por analogía, NO VERIFICADO) |

Nota: en agosto quedó registrado "ferry pausado hasta nuevo aviso", pero hoy la página /ferry/taboga muestra horarios y "Comprar boleto". Conviene confirmar el estado real antes de listarlo en Atlante.

### 4.4 Reglas comerciales del portal de reventa

| Regla | Por qué |
|---|---|
| Paridad de precio con PEX, siempre | El cliente ve el precio final en PEX; cualquier diferencia rompe la confianza y la comisión no justifica el margen |
| Mismas políticas que PEX (100 % al reservar tour, reembolso sólo 24 h, charter 30 % apartado) mostradas antes del clic 3 | Evita reclamos "en Atlante decía otra cosa" |
| Transparencia "Agente autorizado de Pacific Experience" en catálogo, paso 3 y footer | Cumple deber de información al consumidor y explica por qué el pago cambia de dominio |
| Comisión interna sugerida: la misma que ya definiste para B2B en PEX (20 %) | Un solo número para Atlante, hoteles y agencias simplifica el reporte |
| Lead siempre capturado antes de redirigir | El abandono en checkout se recupera por WhatsApp desde el número de Atlante (+507 6860 3623), que es distinto al de PEX |

## 5. Portal de reservas de naves — marketplace de charters

### 5.1 Qué es y qué no es

Atlante lista "los mejores charters de Panamá": las 3 naves de PEX más las de operadores aliados. Para naves de PEX el cierre es el checkout de PEX (`/charter/checkout?vessel=aura&ref=ATLANTE`, apartado 30 %). Para naves de terceros, en la versión 1 el cierre es una cotización gestionada por el concierge de Atlante (lead → WhatsApp → propuesta → el operador cobra al cliente → el operador paga comisión a Atlante). Sólo cuando un operador tenga reserva online propia se le hace deep-link como a PEX.

### 5.2 Ficha estándar de nave (campos del catálogo en Supabase)

| Campo | Ejemplo Aura (observado en PEX) | Obligatorio |
|---|---|---|
| Nombre, tipo, eslora | Aura · catamarán · eslora NO ENCONTRADA en la ficha | Sí |
| Operador (`source`) | pex / nombre del aliado | Sí |
| Capacidad máxima | Hasta 35 personas | Sí |
| Salida (marina) | Marina Flamenco, Amador | Sí |
| Duraciones y precios | 4h · 8h · 12h; barco completo desde $1,300; desde $55/persona | Sí |
| Rutas | Taboga, Bahía, Las Perlas | Sí |
| Incluye | Combustible, capitán y marino, hielo/coolers, nevera, toallas, agua y sodas, BBQ, piscina de mar, A/C, camarotes, baños y duchas, agua caliente, sonido | Sí |
| Bajo solicitud | Snorkel, kayaks, sillas flotantes, pesca | No |
| Política de apartado y cancelación | 30 % apartado; saldo 24 h antes (regla PEX) | Sí |
| Fotos (mín. 8) y video | Galería 23 fotos en PEX | Sí |
| Reseñas reales con fuente | 5.0 · 9 reseñas Google (PEX) | No |
| Modo de cierre | `deeplink` (URL) o `cotizacion` (lead) | Sí |
| Comisión pactada y contrato firmado | 20 % PEX/B2B; terceros según acuerdo | Sí (interno, no visible) |

### 5.3 Flujo de cotización de charter (naves de terceros)

| Paso | Atlante | Operador aliado |
|---|---|---|
| 1 | Cliente elige nave, fecha, horas, pax y deja datos → lead en Supabase con `vessel_id` | — |
| 2 | Concierge confirma disponibilidad por WhatsApp/Email con el operador (SLA 2 h) | Responde disponibilidad y precio final |
| 3 | Atlante envía propuesta al cliente (plantilla PDF ya existente en tu flujo de propuestas) con precio del operador, sin recargo visible | — |
| 4 | Cliente acepta → Atlante pasa el contacto y el resumen al operador | Operador cobra apartado y saldo directamente al cliente |
| 5 | Operador confirma pago → Atlante marca `pagado` | Paga comisión a Atlante a fin de mes contra factura |

Motivo de que cobre el operador: Atlante no maneja dinero de clientes, no necesita pasarela ni fianza, y la responsabilidad del servicio (seguro, licencias AMP, tripulación) queda en quien opera la nave.

### 5.4 Funciones del portal de charters

| Función | Descripción | Prioridad |
|---|---|---|
| Listado con filtros | Capacidad, presupuesto, duración, ruta, tipo de nave, salida | Alta |
| Comparador real | Reemplaza /compare: hasta 4 naves, precio por hora y por persona, incluye/no incluye | Alta |
| "Precio por persona" calculado | Barco completo ÷ pax elegido, como ya hace PEX ("desde $55/persona") | Alta |
| Disponibilidad | PEX: del feed; terceros: "consultar" con badge de tiempo de respuesta real | Media |
| Ocasiones | Landing por ocasión: cumpleaños, despedida, corporativo, propuesta de matrimonio, atardecer | Media |
| Sello "Operador verificado" | Sólo con licencia AMP, seguro y contrato de comisión firmados (checklist interno) | Media |
| Alta de operador (self-service) | Formulario /aliados/registro que crea la ficha en borrador para revisión | Media |
| Calendario compartido | Cuando haya 3+ operadores, sincronizar bloqueos por iCal/WhatsApp | Baja |

## 6. Alianzas — cómo usar Atlante como paraguas

| Tipo de aliado | Qué le ofrece Atlante | Cómo cierra | Comisión | Herramienta |
|---|---|---|---|---|
| Operadores de charter (yates, lanchas, veleros) | Ficha en el marketplace, leads calificados, propuesta profesional | Cotización → operador cobra | 10–20 % pagada por el operador | Contrato de agencia/comisión + ficha estándar |
| Hoteles y concierges | Portal con su propio código de referido (reutiliza `referral_code` de PEX; para terceros lo lleva Atlante) | Cliente reserva en Atlante con código del hotel | El hotel recibe parte de la comisión (p.ej. 10 % de los 20 %) | Landing /aliados + reporte mensual |
| Agencias y DMC | Tarifa neta y listado unificado (ferry + tours + charters) | Reserva en PEX con código de la agencia | Igual que B2B PEX (20 %) | Los ~62 prospectos ya compilados para PEX se pueden trabajar desde Atlante sin canibalizar la marca PEX |
| Organizadores de eventos (Instagram) | Party en la Bahía y charters para grupos 30–80 | Deep-link PEX | Comisión por evento | Kit de promo con enlaces `ref=` únicos |
| Restaurantes/actividades en Taboga | Paquete ferry + almuerzo/actividad | Ferry en PEX + reserva del aliado | Cruzada | Página /destinos/taboga |

## 7. Marca, confianza y legal

| Tema | Recomendación |
|---|---|
| Posicionamiento | Mantener la voz de "concierge marítimo que elige por ti" — es lo que justifica un broker frente a ir directo a PEX. Hero actual está bien; hay que cambiar el subtítulo por algo verificable ("Comparamos ferry, tours y charters de operadores verificados y te llevamos al pago directo con el operador") |
| Relación con PEX | Declararla: "Agente autorizado de Pacific Experience" en catálogo, checkout y footer. No presentar a Atlante como independiente si comparte dueño: lo verificable no da problemas, lo inventado sí |
| Reseñas | Sólo reales y con fuente. Se puede mostrar el widget de Google de PEX en las fichas de PEX ("Reseñas del operador") |
| Textos legales | /terminos (rol de intermediario, quién cobra, quién opera), /privacidad (datos del lead, handoff a PEX, cookies), /cancelaciones (espejo de PEX + regla por operador), /como-funciona (3 clics explicados) |
| Datos del negocio | Razón social y RUC de la entidad que factura comisiones (NO ENCONTRADO en el sitio). Si Atlante factura a operadores, necesita entidad y facturación propias |
| Marca y dominio | Comprar atlantedelpacifico.com (el sitio ya lo cita en canonical/email) y redirigir al .lat, o eliminar toda referencia al .com |
| Números de contacto | Mantener el WhatsApp de Atlante (+507 6860 3623) separado del de PEX (+507 6493-5541 / 6441-5920) para que el cliente perciba dos marcas y el seguimiento se pueda medir |
| Consumidor | Sin urgencia inventada, precio final visible antes del clic 3, mismas políticas que el operador |

## 8. SEO, contenido y adquisición

| Área | Acción | Nota |
|---|---|---|
| Técnico | Canonical/sitemap/robots al .lat; hreflang es/en; JSON-LD `TouristTrip` (ya existe) + `Product/Offer` con precio real + `Organization`; Search Console para el .lat | Corrige D1/D13 |
| Palabras clave de broker (no compiten con PEX) | "alquiler de yate en Panamá precios", "mejores charters Panamá", "comparar tours a Taboga", "cómo llegar a Taboga", "yate para cumpleaños Panamá", "charter Las Perlas" | PEX se queda con marca + producto ("ferry Taboga", "tour bahía") |
| Páginas de destino | /destinos/taboga, /las-perlas, /bahia con "todas las formas de ir" y enlaces a ferry/tour/charter | Es donde un comparador gana tráfico orgánico |
| Contenido | Guías comparativas (ferry vs charter a Taboga, cuánto cuesta un yate por persona, mejor mes para Las Perlas) | 2 artículos/mes; reutilizar el calendario social semanal ya planeado |
| Google Business Profile | Sólo si Atlante tiene dirección/entidad distinta a PEX; dos perfiles del mismo negocio en la misma dirección violan las políticas de Google | NO decidido |
| Ads | Google: Atlante puja por términos de comparación/charter y PEX por marca/producto (evitar pujar los dos por lo mismo). Meta: Atlante como marca "concierge" con leads; remarketing a quienes abandonaron en PEX con `ref=ATLANTE` | Requiere D10 |
| Medición | Objetivo único: reservas confirmadas en PEX con `referral_code=ATLANTE` y cotizaciones cerradas de terceros; tablero mensual en Sheets | — |

## 9. Revisión del prompt que pegaste para la sesión de código

El prompt está bien armado (fases, `PENDIENTE MARK`, helper único `buildPexUrl()`, add-ons genéricos). Estas son las correcciones y los huecos que detecté al contrastarlo con lo que hay publicado hoy:

| # | Tema | Qué dice el prompt | Qué observé | Corrección |
|---|---|---|---|---|
| P1 | Bloque 0 "cuadro gigante de fechas" | Lo pone como P0 del repo de Atlante y pide capturas antes/después | Ese cuadro (píldoras con decenas de fechas hasta diciembre + input de fecha suelto + "No hay salidas disponibles") está en **PEX** (`/ferry/bahia`), no en Atlante. Atlante hoy tiene un input de fecha simple | Mover el Bloque 0 a la sesión de PEX. En Atlante queda como especificación del calendario del nuevo funnel (días sin salida deshabilitados), sin "antes/después" |
| P2 | Fase 0 punto 2: "comprueba si el checkout acepta parámetros" | Se le pide a Code que lo descubra | Ya verificado: `/tours/checkout?slot_id=&trip_id=&date=` (3 parámetros); campo "Código de referido" (`name=referral_code`) existe en el formulario; aceptación de `ref`/`ref_id`/prefill por URL NO VERIFICADA; charter: `/charter/checkout?vessel=aura` | Pegar estos datos en el prompt para que Code no repita la exploración; dejar sólo la verificación de `ref` por URL |
| P3 | Fuente de fechas del funnel | "Las fechas disponibles salen de la misma fuente que hoy (Supabase / lo que exista)" | Atlante no tiene fechas reales de PEX; las salidas viven en PEX. Sin feed, el paso 2 mostraría fechas inventadas o desactualizadas | Añadir a "Requiere cambio en PEX" un feed público sólo lectura (`GET /api/public/trips`, `GET /api/public/slots`) y en Atlante un cron que lo copie a Supabase. Mientras no exista: paso 2 con fecha libre + aviso "disponibilidad se confirma en PEX" |
| P4 | Datos personales en la URL | "redirige a `pex_url` con `?ref=atlante&ref_id=` + los parámetros de prefill que PEX acepte" (nombre, email, teléfono) | Nombre/correo/teléfono en query string quedan en logs, analítica e historial | Prefill vía token de un solo uso (`h=<token>`, PEX lo resuelve servidor-a-servidor) o sin prefill de datos personales; sólo `ref`, `ref_id`, `trip_id`, `slot_id`, `date`, `tickets`, UTM |
| P5 | Falta: canonical/sitemap/robots al .com muerto | No lo menciona | D1 (crítico SEO) | Añadir como P0 del Bloque 5 |
| P6 | Falta: prueba social y urgencia inventadas | No lo menciona | D4, D5 (127 reseñas, testimonios, "Pocos cupos") | Añadir como P0 del Bloque 1: eliminar todo lo no verificable |
| P7 | Falta: email en dominio inexistente y selector de moneda | No lo menciona | D2, D12 | Añadir a Bloque 1 (`PENDIENTE MARK` el buzón real) |
| P8 | Ferry Taboga | "todos los tours y ferrys de PEX" | En agosto quedó "ferry pausado hasta nuevo aviso"; hoy la web lo muestra activo con horarios y "Comprar boleto" | Confirmar estado antes de cargarlo con `disponible = true` |
| P9 | Contadora | "hoy figura en PEX como no disponible por el momento" | Coincide con lo registrado ($130, "no disponible por el momento") | OK; el add-on "Tour por las islas — 4 h — +$50" queda con unidad `PENDIENTE MARK` |
| P10 | Comisión | "% comisión" en `PENDIENTE MARK` | Para B2B de PEX ya definiste 20 % | Decidir si Atlante usa el mismo 20 % (simplifica el reporte) |
| P11 | Webhook de conversión | "`convertido` lo marca Mark a mano hasta que PEX devuelva datos" | Correcto para arrancar; a mano no escala | Añadir a "Requiere cambio en PEX": POST firmado a Atlante al confirmarse pago con `ref=atlante` |
| P12 | Idioma | "si es sólo español, no inventes traducciones" | El sitio tiene botón ES/EN y textos EN parciales; sin hreflang | Mantener EN como P2 y añadir hreflang cuando se complete |

## 10. Roadmap priorizado

| Fase | Cuándo | Entregables | Dónde | Esfuerzo |
|---|---|---|---|---|
| 0 · Limpieza | Esta semana | D1 canonical/sitemap/robots al .lat; D2 email; D3 precios reales; D4/D5 quitar reseñas, métricas y urgencia inventadas; D11 legales en borrador; D12 moneda; disclosure "Agente autorizado de PEX" | Atlante | 1–2 días |
| 1 · Ticketería PEX | Semana 1–2 | Catálogo PEX en Supabase (`products`, `product_addons`) + admin; funnel `/reservar/[slug]` 3 pasos; `leads`; `buildPexUrl()` con `ref`/`ref_id`/UTM; pantalla de redirección; analítica por paso; `npm run check:pex` | Atlante | 5–7 días |
| 1b · Cambios mínimos en PEX | Paralelo | Leer `ref`/`ref_id` en checkout y guardarlos en la orden; prefill por token; feed público de trips/slots; webhook de confirmación; add-on Contadora premarcado por `addon=`; Bloque 0 (calendario en vez de píldoras) | PEX | 3–4 días |
| 2 · Charters | Semana 3–4 | `/charters` con filtros, fichas de Aura / Pacific Ferry 1 / Sirena del Mar, badge "Reserva directa" vs "Cotizar", `partner_applications`, admin de naves con `comision_pct` | Atlante | 4–6 días |
| 3 · Alianzas | Semana 4 en adelante | Contrato de comisión tipo, kit de operador, 5 primeros operadores reales, hoteles/concierges con código | Comercial | Continuo |
| 4 · Crecimiento | Mes 2 | Páginas de destino, comparador real, 2 guías/mes, GA4 + Meta con cross-domain, ads segmentados por marca, tablero mensual de comisiones | Atlante + PEX | Continuo |

## 11. Decisiones que necesito de ti (`PENDIENTE MARK`)

| # | Decisión | Opciones |
|---|---|---|
| 1 | Comisión Atlante → PEX | 20 % (igual a B2B) / otro |
| 2 | Comisión con operadores aliados | 10 % / 15 % / 20 % / por acuerdo |
| 3 | Unidad del add-on de Contadora (+$50) | por persona / por reserva |
| 4 | Buzón real de Atlante | concierge@atlantedelpacifico.lat / Gmail / otro |
| 5 | Dominio .com | comprar y redirigir / eliminar referencias |
| 6 | Logo de PEX en Atlante | sí / no |
| 7 | Entidad que factura comisiones | Tanya Engineering / SEDECO / nueva |
| 8 | Ferry Taboga hoy | activo / pausado |
| 9 | Google Business Profile para Atlante | sí (dirección propia) / no |
| 10 | Quién implementa los cambios en PEX | sesión de Code de PEX (te dejo la especificación lista en el prompt v2) |