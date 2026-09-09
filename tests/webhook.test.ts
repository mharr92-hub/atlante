/**
 * Firma y forma del webhook de PEX (criterio A11 del PRD).
 *
 * Casos exigidos por el bloque 3.6: firma válida, firma inválida, timestamp
 * viejo y reenvío duplicado.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  commissionFor,
  isDuplicateEvent,
  isRevertEvent,
  MAX_SKEW_MS,
  parseWebhookBody,
  sha256,
  signWebhook,
  verifyWebhook,
} from "@/lib/pex-webhook";

const SECRET = "secreto-de-prueba-de-32-caracteres--";
const NOW = Date.UTC(2026, 8, 9, 12, 0, 0);

const PAYLOAD = {
  event: "booking.paid",
  pex_booking_id: "pex_0001",
  ref: "ATLANTE",
  ref_id: "ld_abc",
  product: { type: "tour", id: "c0d1a003", name: "Tour por la Bahía" },
  service_date: "2026-09-18",
  tickets: 2,
  amount: 50,
  currency: "USD",
  paid_at: "2026-09-09T12:00:00.000Z",
  customer_email_sha256: sha256("persona@example.com"),
};

const BODY = JSON.stringify(PAYLOAD);

test("firma válida: el evento se acepta", () => {
  const timestamp = String(NOW);
  const check = verifyWebhook({
    timestamp,
    signature: signWebhook(timestamp, BODY, SECRET),
    rawBody: BODY,
    secret: SECRET,
    now: NOW,
  });
  assert.deepEqual(check, { ok: true });
});

test("firma inválida: 401", () => {
  const timestamp = String(NOW);
  const check = verifyWebhook({
    timestamp,
    signature: signWebhook(timestamp, BODY, "otro-secreto"),
    rawBody: BODY,
    secret: SECRET,
    now: NOW,
  });
  assert.deepEqual(check, { ok: false, status: 401, error: "bad_signature" });
});

test("cuerpo alterado con la firma original: 401", () => {
  const timestamp = String(NOW);
  const signature = signWebhook(timestamp, BODY, SECRET);
  const check = verifyWebhook({
    timestamp,
    signature,
    rawBody: BODY.replace('"amount":50', '"amount":5000'),
    secret: SECRET,
    now: NOW,
  });
  assert.equal(check.ok, false);
});

test("sin cabecera de firma: 401", () => {
  const check = verifyWebhook({
    timestamp: String(NOW),
    signature: null,
    rawBody: BODY,
    secret: SECRET,
    now: NOW,
  });
  assert.deepEqual(check, { ok: false, status: 401, error: "bad_signature" });
});

test("timestamp de hace 10 minutos: 400 antes de mirar la firma", () => {
  const old = NOW - 10 * 60 * 1000;
  const timestamp = String(old);
  const check = verifyWebhook({
    timestamp,
    signature: signWebhook(timestamp, BODY, SECRET),
    rawBody: BODY,
    secret: SECRET,
    now: NOW,
  });
  assert.deepEqual(check, { ok: false, status: 400, error: "stale_timestamp" });
});

test("un timestamp del futuro también se rechaza", () => {
  const future = NOW + MAX_SKEW_MS + 1000;
  const timestamp = String(future);
  const check = verifyWebhook({
    timestamp,
    signature: signWebhook(timestamp, BODY, SECRET),
    rawBody: BODY,
    secret: SECRET,
    now: NOW,
  });
  assert.equal(check.ok, false);
});

test("un timestamp que no es número: 400", () => {
  const check = verifyWebhook({
    timestamp: "ayer",
    signature: "x",
    rawBody: BODY,
    secret: SECRET,
    now: NOW,
  });
  assert.deepEqual(check, { ok: false, status: 400, error: "stale_timestamp" });
});

test("sin PEX_WEBHOOK_SECRET la ruta no está configurada: 503", () => {
  const check = verifyWebhook({
    timestamp: String(NOW),
    signature: "x",
    rawBody: BODY,
    secret: "",
    now: NOW,
  });
  assert.deepEqual(check, { ok: false, status: 503, error: "not_configured" });
});

test("el cuerpo tiene que traer event y pex_booking_id", () => {
  const ok = parseWebhookBody(BODY);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.event, "booking.paid");
    assert.equal(ok.bookingId, "pex_0001");
  }

  assert.deepEqual(parseWebhookBody("{no json"), {
    ok: false,
    status: 400,
    error: "bad_json",
  });
  assert.deepEqual(parseWebhookBody(JSON.stringify({ event: "booking.paid" })), {
    ok: false,
    status: 400,
    error: "missing_fields",
  });
  assert.deepEqual(parseWebhookBody(JSON.stringify({ pex_booking_id: "x" })), {
    ok: false,
    status: 400,
    error: "missing_fields",
  });
});

test("un reenvío choca con el único (pex_booking_id, event) y no duplica", () => {
  // Es lo que Prisma devuelve al violar un índice único.
  assert.equal(isDuplicateEvent({ code: "P2002" }), true);
  assert.equal(isDuplicateEvent({ code: "P2003" }), false);
  assert.equal(isDuplicateEvent(new Error("otro")), false);
  assert.equal(isDuplicateEvent(null), false);
});

test("cancelaciones y reembolsos revierten la comisión", () => {
  assert.equal(isRevertEvent("booking.cancelled"), true);
  assert.equal(isRevertEvent("booking.refunded"), true);
  assert.equal(isRevertEvent("booking.paid"), false);
});

test("la comisión se redondea a centavos", () => {
  assert.equal(commissionFor(50, 20), 10);
  assert.equal(commissionFor(35, 20), 7);
  assert.equal(commissionFor(1300, 20), 260);
  assert.equal(commissionFor(33.33, 20), 6.67);
  assert.equal(commissionFor(0, 20), 0);
});
