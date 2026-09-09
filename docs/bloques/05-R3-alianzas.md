# Bloque 5 — R3 · Alianzas y códigos de aliado (P1)

Objetivo: que hoteles, concierges, agencias y organizadores puedan recomendar Atlante con su propio código y que la comisión se reparta en el reporte, sin cambiar nada del lado de PEX (PEX solo conoce `ref=ATLANTE`).

## 5.1 Códigos de aliado

- Reutiliza el modelo `Reseller` (nombre, email, `referralCode`, `commissionPercent`, `active`). Añade `kind` ("hotel" | "agency" | "organizer" | "operator"), `whatsapp?`, `notes?` con migración `0005_partners`.
- `middleware.ts`: si llega `?partner=CODE` (o `?ref=CODE` en rutas de Atlante), guarda cookie `atl_partner` de 30 días (httpOnly no, para que el funnel lo lea) y limpia el parámetro de la URL canónica.
- `POST /api/leads` valida `partnerCode` contra `Reseller.active` y lo guarda en `Lead.partnerCode`; si no existe, lo ignora sin error.
- Reporte `/admin/comisiones`: columna "aliado" y reparto: comisión Atlante = monto × `commissionPct`; parte del aliado = monto × `Reseller.commissionPercent` (PENDIENTE MARK: reparto por defecto); export CSV por aliado.
- `/admin/aliados`: alta manual de `Reseller` (código en mayúsculas, único), enlace de invitación `https://www.atlantedelpacifico.lat/?partner=CODE` con botón copiar, y revisión de `PartnerApplication` (aprobar → crea `Reseller` u `Operator` según `kind`).

## 5.2 Materiales (borradores en `docs/comercial/`, marcados BORRADOR — revisar Mark)

- `contrato-comision-operador.md`: objeto (intermediación), comisión (porcentaje en blanco), forma de pago (mensual contra factura), obligaciones del operador (licencia, seguro, precio igual al público), datos que se comparten, duración y terminación. Sin citar leyes.
- `kit-operador.md`: qué necesita Atlante para publicar una nave (8 fotos mínimo, capacidad, marina, tabla de precios por ruta/duración, incluye/no incluye, políticas, WhatsApp de contacto).
- `propuesta-hoteles.md`: cómo funciona el código, qué gana el hotel, ejemplo con números en blanco.

## 5.3 Verificación

- Tests: cookie de partner → lead con `partnerCode`; código inactivo se ignora; reparto de comisión.
- `npm run lint && npm run build && npm run test`. Reporte `docs/reportes/bloque-05.md`.