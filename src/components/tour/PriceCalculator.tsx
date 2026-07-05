"use client";

import { useState } from "react";
import type { Tour } from "@/content/tours";
import { useLocale } from "@/lib/locale-context";
import { useCurrency } from "@/lib/currency-context";
import { L, t } from "@/lib/i18n";
import { money, priceForGuests, depositAmount } from "@/lib/format";
import { whatsappUrl } from "@/config/site";

/**
 * Group-size selector + live pricing + deposit + booking request.
 * On submit it records a pending booking (the admin pipeline) via /api/bookings,
 * then hands off to WhatsApp to close the sale. Price is recomputed server-side;
 * if the DB isn't configured the request is skipped and WhatsApp still opens.
 */
export default function PriceCalculator({ tour }: { tour: Tour }) {
  const { locale } = useLocale();
  const { currency } = useCurrency();
  const [guests, setGuests] = useState(
    tour.pricing.model === "perBoat" ? tour.pricing.baseCapacity : 2,
  );
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const total = priceForGuests(tour, guests);
  const deposit = depositAmount(total, tour.pricing.depositPercent);
  const min = 1;
  const max = tour.pricing.maxCapacity;

  function waMessage() {
    const base =
      locale === "es"
        ? `Hola Atlante, quiero reservar ${L(tour.name, "es")} para ${guests} invitados`
        : `Hi Atlante, I'd like to book ${L(tour.name, "en")} for ${guests} guests`;
    const parts = [
      base + (date ? (locale === "es" ? ` el ${date}` : ` on ${date}`) : "") + ".",
      name && `${locale === "es" ? "Nombre" : "Name"}: ${name}`,
      `${locale === "es" ? "Total estimado" : "Estimated total"}: ${money(total, currency)}`,
      `${locale === "es" ? "Deposito" : "Deposit"}: ${money(deposit, currency)}`,
    ].filter(Boolean);
    return parts.join("\n");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    // Best-effort: record the request. Never block the WhatsApp handoff.
    if (date && name && email) {
      try {
        await fetch("/api/bookings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tourSlug: tour.slug, date, guests, name, email }),
        });
      } catch {
        /* ignore — WhatsApp handoff below still works */
      }
    }
    setSending(false);
    window.open(whatsappUrl(waMessage()), "_blank", "noopener,noreferrer");
  }

  return (
    <form className="book-panel" onSubmit={submit}>
      <div className="price-big">{money(tour.pricing.priceFrom, currency)}</div>
      <div className="price-sub">
        {t("from", locale)} ·{" "}
        {tour.pricing.model === "perPerson" ? t("per_person", locale) : t("per_boat", locale)} ·{" "}
        {L(tour.duration, locale)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 0 8px" }}>
        <span style={{ fontWeight: 700 }}>{t("guests", locale)}</span>
        <div className="stepper">
          <button type="button" onClick={() => setGuests((g) => Math.max(min, g - 1))} aria-label="-">
            −
          </button>
          <span>{guests}</span>
          <button type="button" onClick={() => setGuests((g) => Math.min(max, g + 1))} aria-label="+">
            +
          </button>
        </div>
      </div>

      <div className="price-line">
        <span>{t("total", locale)}</span>
        <span>{money(total, currency)}</span>
      </div>
      <div className="price-line total">
        <span>
          {t("deposit", locale)} ({tour.pricing.depositPercent}%)
        </span>
        <span>{money(deposit, currency)}</span>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <input
          type="date"
          aria-label={t("form_date", locale)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="text"
          placeholder={t("form_name", locale)}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder={t("form_email", locale)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        className="button button-primary"
        style={{ width: "100%", marginTop: 14 }}
        type="submit"
        disabled={sending}
        data-analytics="reserve-calc"
      >
        {t("nav_reserve", locale)}
      </button>
      <p style={{ fontSize: 12, color: "rgba(10,36,33,.55)", marginTop: 10, textAlign: "center" }}>
        {locale === "es"
          ? "Reserva ahora, paga el resto despues."
          : "Reserve now, pay the rest later."}
      </p>
    </form>
  );
}
