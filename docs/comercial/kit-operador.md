# BORRADOR — revisar Mark · Kit del operador: qué necesita Atlante para publicar tu nave

> **Borrador de trabajo.** Lo escribió la sesión de código a partir de la ficha estándar de nave que ya existe en el sitio (`Vessel` en `prisma/schema.prisma`, ficha pública en `/charters/[slug]`) y del PRD 5.7. Antes de mandárselo a un operador, revisar el tono y confirmar los puntos marcados **PENDIENTE MARK**.

Atlante del Pacífico compara ferry, tours y charters y manda al cliente a pagar **directamente con quien opera la nave**. Nosotros no cobramos al cliente y no operamos nada: publicamos tu ficha, recibimos la consulta y te la pasamos con todo lo necesario para que cierres.

Para publicar una nave necesitamos esto. Lo que no nos mandes, **no se publica**: no inventamos precios, capacidades ni políticas.

---

## 1. Lo obligatorio

| # | Qué | Formato | Por qué |
|---|---|---|---|
| 1 | **Nombre de la nave** | Texto | Es el título de la ficha y el que ve el cliente |
| 2 | **Tipo** | Catamarán, yate, lancha, velero, ferry… | Es uno de los filtros del listado |
| 3 | **Capacidad máxima de pasajeros** | Número | Filtra por tamaño de grupo y limita el formulario: nadie puede pedir más personas de las que caben |
| 4 | **Marina o punto de salida** | Nombre y ciudad | Es otro filtro, y es lo primero que pregunta el cliente |
| 5 | **Rutas que haces** | Lista (bahía, Taboga, Las Perlas, otra) | Filtro y contenido de la ficha |
| 6 | **Tabla de precios por ruta y jornada** | Ver §2 | Sin esto **no hay ficha**: es lo que hace que el cliente compare |
| 7 | **Qué incluye** | Lista | Combustible, capitán, tripulación, hielo, nevera, agua, sonido, etc. |
| 8 | **Qué no incluye / bajo solicitud** | Lista, con precio si lo tiene | Snorkel, kayaks, pesca, comida, barra… |
| 9 | **Apartado y política de cancelación** | % de apartado y regla de cancelación | Se publica tal cual: es lo que el cliente acepta |
| 10 | **Fotos** | **8 como mínimo** — ver §3 | Sin fotos la ficha no compite |
| 11 | **WhatsApp de contacto** | Número con código de país | Es por donde te llegan las consultas |
| 12 | **Licencia de la autoridad marítima** | Copia | Requisito para publicar |
| 13 | **Seguro vigente** | Copia + fecha de vencimiento | Requisito para publicar; si vence, la ficha se baja |

## 2. La tabla de precios

Es lo que más nos cuesta conseguir y lo más importante. La necesitamos **por ruta, por jornada y por tramo de capacidad**, con el precio del **barco completo** (no por persona: el precio por persona lo calcula el sitio dividiendo entre el grupo que el cliente elija).

Una fila por combinación:

| Ruta | Jornada | Hasta N personas | Precio del barco completo |
|---|---|---|---|
| Bahía de Panamá | 4 h | 15 | $ __________ |
| Bahía de Panamá | 4 h | 30 | $ __________ |
| Taboga | 8 h | 15 | $ __________ |
| Las Perlas | 12 h | 15 | $ __________ |

Reglas:

- **Si un tramo no tiene precio publicado, no lo inventamos.** El cliente ve "sin tarifa publicada para ese grupo: consúltanos" en vez de un número. Eso convierte peor: mientras más filas nos des, mejor.
- El precio publicado tiene que ser el **mismo que le cobras a un cliente que te llegue por tu cuenta**. La comisión no se le suma al cliente.
- Si el precio cambia, avísanos antes de que aplique. Cada ficha lleva una fecha de verificación visible internamente y saltan avisos a los 14 días.
- Si hay recargos previsibles (día festivo, fin de semana, combustible por ruta larga), dínoslos: se publican como nota, no como sorpresa.

## 3. Las fotos

- **Mínimo 8.** Ideal 15–20.
- Horizontales, lo más grandes que tengas (mínimo 1600 px de ancho), sin marcas de agua ni texto encima.
- Qué queremos ver, en este orden: la nave completa desde afuera y en el agua · la cubierta principal · la zona de sombra o comedor · el interior (salón, camarotes) · el baño · la proa o la zona de sol · gente a bordo si tienes permiso de las personas · un detalle (barra, equipo de sonido, plataforma de baño).
- Vídeo corto: opcional, suma.
- Confirma que tienes derecho a usarlas. Si son de un fotógrafo, que lo autorice.

## 4. Datos de contacto y facturación

| Qué | Para qué |
|---|---|
| Nombre comercial y razón social | Ficha y contrato |
| RUC | Facturación de la comisión |
| Persona de contacto y cargo | Para hablar con alguien, no con un número |
| WhatsApp | Consultas de clientes |
| Correo | Liquidación mensual |
| Horario de atención | Para saber cuándo esperamos respuesta |

## 5. Cómo funciona después de publicar

1. El cliente entra a `/charters`, filtra por personas, presupuesto, jornada y ruta, y ve el **precio por persona** calculado a partir de tu tabla.
2. Abre tu ficha, ve fotos, lo que incluye, el apartado y la política de cancelación.
3. Deja fecha, jornada, número de personas, ocasión y sus datos.
4. **La consulta te llega a ti** con todo eso y un identificador de lead.
5. Tú cotizas, cobras y prestas el servicio. Atlante no toca el dinero del cliente.
6. A fin de mes te mandamos el detalle de las reservas que salieron de Atlante y la factura de la comisión (ver `contrato-comision-operador.md`).

## 6. Lo que no hacemos

- No cobramos al cliente ni le pedimos datos de tarjeta.
- No prometemos disponibilidad que no nos hayas confirmado.
- No publicamos reseñas, calificaciones ni "cupos que se acaban" que no sean reales.
- No publicamos un precio distinto del tuyo.

## 7. Cómo empezar

Escríbenos por WhatsApp al **+507 6860 3623** o entra a **atlantedelpacifico.lat/aliados/registro** y déjanos tus datos. Te mandamos esta lista en un formulario y, en cuanto tengamos las fotos y la tabla de precios, publicamos.

---

## Notas para Mark (no van en el documento que se manda)

| # | Qué falta | Dónde se decide |
|---|---|---|
| 1 | Porcentaje de comisión: este kit **no lo menciona** porque no está decidido | Decisión #2 del PRD |
| 2 | Plazo de publicación desde que llega el material ("publicamos en X días") | Comercial |
| 3 | Horario de atención de Atlante, para poder comprometer tiempos de respuesta | Decisión #12 del PRD |
| 4 | Si Atlante ofrece ayuda con la sesión de fotos o sólo las pide | Comercial |
