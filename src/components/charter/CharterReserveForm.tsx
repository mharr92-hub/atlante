"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Charter } from "@/data/charters";
import { DEPOSIT_PERCENT, depositFromSample } from "@/data/charters";
import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";
import { money } from "@/lib/format";
import { useCurrency } from "@/lib/currency-context";
import DepositDisclaimer from "@/components/charter/DepositDisclaimer";

export default function CharterReserveForm({
  charter,
  initialDurationId,
}: {
  charter: Charter;
  initialDurationId?: string;
}) {
  const { locale } = useLocale();
  const { currency } = useCurrency();
  const router = useRouter();
  const defaultDuration =
    charter.durations.find((d) => d.id === initialDurationId)?.id ??
    charter.durations.find((d) => d.sampleTotalUsd != null)?.id ??
    charter.durations[0]?.id ??
    "4h";

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [date, setDate] = useState("");
  const [durationId, setDurationId] = useState(defaultDuration);
  const [pax, setPax] = useState(Math.min(8, charter.maxPax ?? 8));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useMemo(
    () => charter.durations.find((d) => d.id === durationId),
    [charter.durations, durationId],
  );
  const sample = duration?.sampleTotalUsd ?? null;
  const deposit = sample != null ? depositFromSample(sample) : null;
  const maxPax = charter.maxPax ?? 99;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/charters/reservar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: charter.slug,
          durationId,
          date,
          guests: pax,
          name,
          whatsapp,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        checkoutUrl?: string | null;
        graciasUrl?: string;
      };
      if (!res.ok || !data.ok) {
        setError(
          locale === "es"
            ? "Revisa los datos e inténtalo de nuevo."
            : "Check the form and try again.",
        );
        setSending(false);
        return;
      }
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      router.push(data.graciasUrl ?? `/reservar/${charter.slug}/gracias?pago=pendiente`);
    } catch {
      setError(
        locale === "es"
          ? "No pudimos enviar la solicitud. Escríbenos por WhatsApp."
          : "We could not send the request. Message us on WhatsApp.",
      );
      setSending(false);
    }
  }

  return (
    <form className="book-panel charter-form" onSubmit={onSubmit}>
      <p className="eyebrow" style={{ color: "var(--bronze)" }}>
        {locale === "es" ? "Solicitud + abono 30%" : "Request + 30% deposit"}
      </p>
      <div className="price-big">
        {deposit != null ? money(deposit, currency) : "—"}
      </div>
      <div className="price-sub">
        {DEPOSIT_PERCENT}% {locale === "es" ? "de abono" : "deposit"}
        {sample != null ? (
          <>
            {" "}
            · {locale === "es" ? "sobre" : "of"} {money(sample, currency)}{" "}
            {locale === "es" ? "(referencia)" : "(reference)"}
          </>
        ) : (
          <> · {locale === "es" ? "precio por confirmar" : "price to confirm"}</>
        )}
      </div>

      <label>
        {locale === "es" ? "Nombre" : "Name"}
        <input
          required
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        {locale === "es" ? "WhatsApp" : "WhatsApp"}
        <input
          required
          name="whatsapp"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+507 6000 0000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </label>
      <label>
        {locale === "es" ? "Fecha" : "Date"}
        <input
          required
          type="date"
          name="date"
          min={new Date().toISOString().slice(0, 10)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        {locale === "es" ? "Horas" : "Hours"}
        <select
          required
          name="duration"
          value={durationId}
          onChange={(e) => setDurationId(e.target.value as typeof durationId)}
        >
          {charter.durations.map((d) => (
            <option key={d.id} value={d.id}>
              {L(d.label, locale)}
              {d.sampleTotalUsd == null
                ? locale === "es"
                  ? " — precio por confirmar"
                  : " — price to confirm"
                : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        {locale === "es" ? "Personas" : "Guests"}
        <input
          required
          type="number"
          min={1}
          max={maxPax}
          name="pax"
          value={pax}
          onChange={(e) => setPax(Math.max(1, Math.min(maxPax, Number(e.target.value) || 1)))}
        />
      </label>

      <DepositDisclaimer />

      {error ? <p className="form-error">{error}</p> : null}

      <button className="button button-primary" type="submit" disabled={sending} style={{ width: "100%" }}>
        {sending
          ? locale === "es"
            ? "Enviando…"
            : "Sending…"
          : deposit != null
            ? locale === "es"
              ? "Pagar abono 30%"
              : "Pay 30% deposit"
            : locale === "es"
              ? "Enviar solicitud"
              : "Send request"}
      </button>
      <p style={{ fontSize: 12, color: "rgba(10,36,33,.55)", marginTop: 10, textAlign: "center" }}>
        {locale === "es"
          ? "Si PagueloFácil no está configurado, guardamos tu solicitud y te escribimos por WhatsApp."
          : "If PagueloFácil is not configured, we save your request and follow up on WhatsApp."}
      </p>
    </form>
  );
}
