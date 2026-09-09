/**
 * Códigos de aliado y reparto de comisión (bloque 5).
 *
 * Lo que se prueba es la lógica pura de `lib/partner-codes.ts` y de
 * `lib/commissions.ts`, que es exactamente la que corren el proxy, `POST
 * /api/leads` y `/admin/comisiones`: el proxy normaliza con
 * `normalizePartnerCode`, `createLead` decide con `pickPartnerCode` +
 * `acceptPartnerCode` (la consulta a `Reseller` sólo trae la fila) y el reporte
 * reparte con `summarizePartnerCommissions`.
 *
 * `lib/partners.ts`, `lib/leads.ts` y `lib/vessel-leads.ts` son `server-only`
 * (Prisma + `next/headers`) y el runner de Node no los puede cargar; su camino
 * completo se ejercita en el humo de `scripts/smoke-bloque5.mjs`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  acceptPartnerCode,
  normalizePartnerCode,
  partnerInviteUrl,
  pickPartnerCode,
  RESELLER_KINDS,
  suggestPartnerCode,
} from "@/lib/partner-codes";
import { summarizePartnerCommissions, type PaidLead } from "@/lib/commissions";

// ------------------------------------------------ normalización del código --

test("el codigo se guarda siempre en mayusculas y sin adornos", () => {
  assert.equal(normalizePartnerCode("hotelx"), "HOTELX");
  assert.equal(normalizePartnerCode("  hotel x  "), "HOTELX");
  assert.equal(normalizePartnerCode("Hotél-X"), "HOTEL-X");
  assert.equal(normalizePartnerCode("hotel_x.1"), "HOTEL_X.1");
});

test("lo que no puede ser un codigo se descarta", () => {
  for (const bad of [undefined, null, "", " ", "a", "!!", "  ¿?  "]) {
    assert.equal(normalizePartnerCode(bad), null, JSON.stringify(bad));
  }
});

test("ATLANTE no es un aliado: es nuestro propio codigo en PEX", () => {
  assert.equal(normalizePartnerCode("ATLANTE"), null);
  assert.equal(normalizePartnerCode("atlante"), null);
  // Pero un aliado sí puede llamarse parecido.
  assert.equal(normalizePartnerCode("ATLANTE-VIP"), "ATLANTE-VIP");
});

test("un codigo larguisimo se recorta a 24 caracteres", () => {
  assert.equal(normalizePartnerCode("A".repeat(80)), "A".repeat(24));
});

test("el codigo escrito en el formulario manda sobre el de la cookie", () => {
  assert.equal(pickPartnerCode("agenciaY", "HOTELX"), "AGENCIAY");
  assert.equal(pickPartnerCode("", "HOTELX"), "HOTELX");
  assert.equal(pickPartnerCode(undefined, "hotelx"), "HOTELX");
  assert.equal(pickPartnerCode("!", "HOTELX"), "HOTELX");
  assert.equal(pickPartnerCode(undefined, undefined), null);
});

// ------------------------------------------- validación contra `Reseller` ---

test("cookie de partner -> el lead se guarda con ese partnerCode", () => {
  const cookie = "hotelx";
  const candidate = pickPartnerCode(undefined, cookie);
  const reseller = { referralCode: "HOTELX", active: true };
  assert.equal(acceptPartnerCode(candidate, reseller), "HOTELX");
});

test("un codigo de aliado inactivo se ignora sin error", () => {
  const candidate = pickPartnerCode("HOTELX", undefined);
  assert.equal(acceptPartnerCode(candidate, { referralCode: "HOTELX", active: false }), null);
});

test("un codigo que no existe se ignora sin error", () => {
  assert.equal(acceptPartnerCode("NOEXISTE", null), null);
  assert.equal(acceptPartnerCode("NOEXISTE", undefined), null);
});

test("una fila de otro aliado nunca valida el codigo pedido", () => {
  assert.equal(acceptPartnerCode("HOTELX", { referralCode: "AGENCIAY", active: true }), null);
});

test("sin codigo no hay aliado, aunque la fila exista", () => {
  assert.equal(acceptPartnerCode(null, { referralCode: "HOTELX", active: true }), null);
  assert.equal(acceptPartnerCode("", { referralCode: "HOTELX", active: true }), null);
});

// ---------------------------------------------------- enlace de invitación --

test("el enlace de invitacion es el dominio .lat con ?partner=CODIGO", () => {
  assert.equal(
    partnerInviteUrl("hotelx", "https://www.atlantedelpacifico.lat"),
    "https://www.atlantedelpacifico.lat/?partner=HOTELX",
  );
  // Una barra de más en la base no duplica la barra del enlace.
  assert.equal(
    partnerInviteUrl("HOTELX", "https://www.atlantedelpacifico.lat/"),
    "https://www.atlantedelpacifico.lat/?partner=HOTELX",
  );
});

test("sin codigo valido el enlace es la home, no una URL rota", () => {
  assert.equal(partnerInviteUrl("!", "https://www.atlantedelpacifico.lat"), "https://www.atlantedelpacifico.lat/");
});

test("el codigo sugerido sale del nombre, sin acentos ni espacios", () => {
  assert.equal(suggestPartnerCode("Hotel Bahía"), "HOTELBAHIA");
  // Se recorta a 12 caracteres: el sufijo de desempate cabe en los 24 del código.
  assert.equal(suggestPartnerCode("Hotel Bahía Grande"), "HOTELBAHIAGR");
  assert.equal(suggestPartnerCode("A"), "");
});

test("los cuatro tipos de aliado del bloque estan en el modelo", () => {
  assert.deepEqual([...RESELLER_KINDS], ["hotel", "agency", "organizer", "operator"]);
});

// ------------------------------------------------------ reparto de comisión --

const lead = (over: Partial<PaidLead> = {}): PaidLead => ({
  productSlug: "tour-bahia",
  vesselSlug: null,
  amount: 100,
  commissionAmount: 20,
  partnerCode: null,
  ...over,
});

const DIRECTORY: Record<string, { name: string; commissionPercent: number }> = {
  HOTELX: { name: "Hotel X", commissionPercent: 5 },
  AGENCIAY: { name: "Agencia Y", commissionPercent: 10 },
};

const partner = (code: string) => DIRECTORY[code] ?? null;

test("el reparto aplica los dos porcentajes sobre el monto, no uno sobre otro", () => {
  const { rows, total, unresolved } = summarizePartnerCommissions(
    [lead({ partnerCode: "HOTELX", amount: 1000, commissionAmount: 200 })],
    partner,
  );

  assert.equal(unresolved, 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, "HOTELX");
  assert.equal(rows[0].label, "Hotel X");
  assert.equal(rows[0].commission, 200); // Atlante: 20 % de 1000
  assert.equal(rows[0].partnerPct, 5);
  assert.equal(rows[0].partnerShare, 50); // aliado: 5 % de 1000
  assert.equal(rows[0].net, 150); // 200 − 50
  assert.equal(total.net, 150);
});

test("los leads sin aliado no reparten nada y el neto es la comision entera", () => {
  const { rows } = summarizePartnerCommissions([lead(), lead()], partner);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, "");
  assert.equal(rows[0].label, "(sin aliado)");
  assert.equal(rows[0].leads, 2);
  assert.equal(rows[0].partnerPct, null);
  assert.equal(rows[0].partnerShare, 0);
  assert.equal(rows[0].net, 40);
});

test("cada aliado agrupa sus leads y el total cuadra", () => {
  const { rows, total } = summarizePartnerCommissions(
    [
      lead({ partnerCode: "HOTELX", amount: 1000, commissionAmount: 200 }),
      lead({ partnerCode: "HOTELX", amount: 500, commissionAmount: 100 }),
      lead({ partnerCode: "AGENCIAY", amount: 2000, commissionAmount: 400 }),
      lead({ amount: 100, commissionAmount: 20 }),
    ],
    partner,
  );

  // Orden por comisión descendente: Agencia Y (400) · Hotel X (300) · sin aliado (20).
  assert.deepEqual(
    rows.map((r) => r.code),
    ["AGENCIAY", "HOTELX", ""],
  );

  const hotel = rows.find((r) => r.code === "HOTELX")!;
  assert.equal(hotel.leads, 2);
  assert.equal(hotel.amount, 1500);
  assert.equal(hotel.commission, 300);
  assert.equal(hotel.partnerShare, 75); // 5 % de 1500
  assert.equal(hotel.net, 225);

  const agencia = rows.find((r) => r.code === "AGENCIAY")!;
  assert.equal(agencia.partnerShare, 200); // 10 % de 2000
  assert.equal(agencia.net, 200);

  assert.equal(total.leads, 4);
  assert.equal(total.amount, 3600);
  assert.equal(total.commission, 720);
  assert.equal(total.partnerShare, 275);
  assert.equal(total.net, 445);
});

test("un aliado sin porcentaje fijado reparte 0 y el neto es la comision entera", () => {
  const { rows, unresolved } = summarizePartnerCommissions(
    [lead({ partnerCode: "NUEVO", amount: 1000, commissionAmount: 200 })],
    (code) => (code === "NUEVO" ? { name: "Nuevo aliado", commissionPercent: 0 } : null),
  );
  assert.equal(unresolved, 0);
  assert.equal(rows[0].partnerPct, 0);
  assert.equal(rows[0].partnerShare, 0);
  assert.equal(rows[0].net, 200);
});

test("un codigo sin aliado activo no inventa reparto y ensucia el total a proposito", () => {
  const { rows, total, unresolved } = summarizePartnerCommissions(
    [
      lead({ partnerCode: "BORRADO", amount: 1000, commissionAmount: 200 }),
      lead({ partnerCode: "HOTELX", amount: 1000, commissionAmount: 200 }),
    ],
    partner,
  );

  assert.equal(unresolved, 1);
  const borrado = rows.find((r) => r.code === "BORRADO")!;
  assert.equal(borrado.label, "BORRADO"); // sin nombre, se muestra el código
  assert.equal(borrado.partnerPct, null);
  assert.equal(borrado.partnerShare, null);
  assert.equal(borrado.net, null);

  // El total suma lo que sí se conoce, pero no afirma un neto que no se puede calcular.
  assert.equal(total.partnerShare, 50);
  assert.equal(total.net, null);
});

test("el reparto redondea a centavos", () => {
  const { rows } = summarizePartnerCommissions(
    [lead({ partnerCode: "HOTELX", amount: 33.33, commissionAmount: 6.67 })],
    partner,
  );
  assert.equal(rows[0].partnerShare, 1.67); // 5 % de 33.33 = 1.6665
  assert.equal(rows[0].net, 5);
});

test("sin leads pagados el reparto es cero y no hay filas", () => {
  const { rows, total, unresolved } = summarizePartnerCommissions([], partner);
  assert.deepEqual(rows, []);
  assert.equal(unresolved, 0);
  assert.equal(total.leads, 0);
  assert.equal(total.partnerShare, 0);
  assert.equal(total.net, 0);
});
