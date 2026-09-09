# BORRADOR — revisar Mark · Propuesta para hoteles, concierges, agencias y organizadores

> **Borrador de trabajo.** Lo escribió la sesión de código a partir del PRD 5.9 y del bloque 5. Los porcentajes y los montos de los ejemplos están **en blanco a propósito**: no hay reparto acordado (decisión #2 del PRD) y no se inventa ninguno. Revisar antes de mandarlo.

## En una frase

Tu huésped te pregunta "¿qué hago mañana?" y hoy le contestas de memoria. Con Atlante le pasas un enlace, él reserva y compara solo, y **tú cobras una comisión por cada reserva que salga de tu código** — sin operar nada, sin cobrar nada y sin firmar exclusividad.

## Cómo funciona

1. Te damos un **código de aliado** y un enlace propio, por ejemplo:

   `https://www.atlantedelpacifico.lat/?partner=TUCODIGO`

2. Ese enlace lo pones donde te sirva: el WhatsApp del concierge, el correo de confirmación de la reserva, un QR en recepción o en la habitación, tu página de "qué hacer en Panamá", el pie de tus mensajes.

3. Cuando alguien entra por ahí, **su navegador guarda tu código 30 días**. Aunque vuelva días después y entre directo, la reserva sigue siendo tuya.

4. El huésped compara ferry, tours y charters, elige y **paga directamente con el operador**. Atlante nunca le cobra ni le pide datos de tarjeta.

5. A fin de mes ves cuántas reservas salieron de tu código, por cuánto, y cuánto te toca.

No tienes que operar nada, no manejas dinero de nadie y no respondes por el servicio: eso es del operador.

## Qué gana el hotel

| | |
|---|---|
| **Comisión** | ______ % del monto de cada reserva originada por tu código |
| **Cero costo** | No pagas por estar; no hay cuota, ni mínimo, ni exclusividad |
| **Cero operación** | No cobras, no coordinas, no llevas a nadie al muelle |
| **Cero riesgo de reclamo** | El servicio lo presta y lo responde el operador |
| **Menos trabajo de recepción** | Una respuesta a "¿qué hago mañana?" que además compara precios |
| **Precio igual al del operador** | Tu huésped no paga de más por venir de tu enlace; si pagara más, el enlace te haría daño |

## Ejemplo con números (los montos son de ejemplo; los porcentajes están sin fijar)

Un mes con **______ reservas** salidas de tu código:

| Concepto | Cálculo | Mes |
|---|---|---|
| Monto reservado por tus huéspedes | — | $ __________ |
| Comisión que Atlante cobra al operador | monto × ______ % | $ __________ |
| **Tu parte** | monto × ______ % | **$ __________** |
| Lo que te cuesta | — | $ 0 |

El reparto se calcula sobre el **monto de la reserva**, no sobre la comisión de Atlante: los dos porcentajes salen del mismo número, para que sea fácil de comprobar.

> Sin acuerdo firmado el porcentaje es 0 %: el código funciona y las reservas se registran igual, pero no reparte nada hasta que el número esté puesto.

## Cómo se liquida

- A fin de mes te mandamos el detalle: fecha, producto o nave, monto y tu parte.
- Pagamos contra factura, dentro de los **______ días hábiles** siguientes.
- Si una reserva se cancela o se reembolsa, no genera comisión; si ya se pagó, se descuenta del mes siguiente.

## Qué se registra de tus huéspedes

Cuando alguien entra por tu enlace guardamos **tu código, la campaña y la página de entrada**. Nada más. El nombre, el correo y el teléfono los deja el huésped en el formulario de reserva, viajan al operador que presta el servicio y **nunca aparecen en una URL**. Tú no recibes datos personales de tus huéspedes por esta vía: recibes el conteo y el monto.

## Preguntas que siempre salen

**¿Mi huésped paga más por venir de mi enlace?** No. Paga el mismo precio publicado por el operador. La comisión sale del operador, no del cliente.

**¿Tengo que hacer algo cuando alguien reserva?** No. Ni cobrar, ni confirmar, ni coordinar.

**¿Y si el huésped reserva desde su propio teléfono, días después?** Si entró alguna vez por tu enlace en ese navegador, sigue contando 30 días.

**¿Y si entra por el enlace de otro aliado?** Cuenta el primero que lo trajo dentro de los 30 días.

**¿Puedo tener varios códigos?** Sí: uno por hotel, por sucursal o por campaña, para saber cuál funciona.

**¿Esto compite con lo que ya vendo en recepción?** No: cubre lo que hoy resuelves con una recomendación de memoria y no te deja nada.

**¿Hay exclusividad?** No.

## Cómo empezamos

1. Nos dices el nombre del aliado, un correo y un WhatsApp.
2. Te damos el código y el enlace (y un QR si lo quieres).
3. Acordamos el porcentaje y firmamos una carta de una página.
4. Empiezas a mandar gente. El primer reporte llega a fin de mes.

WhatsApp **+507 6860 3623** · **atlantedelpacifico.lat/aliados**

---

## Notas para Mark (no van en el documento que se manda)

| # | Qué falta | Dónde se decide |
|---|---|---|
| 1 | El porcentaje del aliado y si es el mismo para hoteles, agencias y organizadores | Decisión #2 del PRD |
| 2 | Plazo de pago de la liquidación | Comercial |
| 3 | Si se ofrece QR impreso y quién lo produce | Comercial |
| 4 | La carta de una página del punto 3 de "Cómo empezamos" **no existe todavía**; el contrato que sí está borroneado es el de operadores (`contrato-comision-operador.md`), que es otro caso | Legal / comercial |
| 5 | La atribución es **de primer contacto** (gana el primer aliado que trajo a la persona, 30 días). Si prefieres último contacto, es un cambio de una línea en `src/proxy.ts` | Producto |
