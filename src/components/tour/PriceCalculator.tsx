"use client";

import { useState } from "react";
import type { Tour } from "@/content/tours";
import { useLocale } from "@/lib/locale-context";
import { useCurrency } from "@/lib/currency-context";
import { L, t } from "@/lib/i18n";
import { money, priceForGuests, depositAmount } from "@/lib/format";
import { whatsappUrl } from "@/config/site";

/**
 * Group-size selector + live pricing + deposit.
 * perPerson tours multiply by guests; perBoat charters add an extra-guest
 * surcharge past the base capacity. The CTA hands off to WhatsApp with the
 * quote details — the sale is closed over WhatsApp (no online checkout).
 */
export default function PriceCalculator({ tour }: { tour: Tour }) {
  const { locale } = useLocale();
  const { currency } = useCurrency();
  const [guests, setGuests] = useState(
    tour.pricing.model === "perBoat" ? tour.pricing.baseCapacity : 2,
  );

  const total = priceForGuests(tour, guests);
  const deposit = depositAmount(total, tour.pricing.depositPercent);
  const min = 1;
  const max = tour.pricing.maxCapacity;

  const waMsg =
    (locale === "es"
      ? `Hola Atlante, quiero reservar ${L(tour.name, "es")} para ${guests} invitados. Total estimado ${money(total, currency)}, deposito ${money(deposit, currency)}.`
      : `Hi Atlante, I'd like to book ${L(tour.name, "en")} for ${guests} guests. Estimated total ${money(total, currency)}, deposit ${money(deposit, currency)}.`);

  return (
    <div className="book-panel">
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

      <a
        className="button button-primary"
        style={{ width: "100%", marginTop: 16 }}
        href={whatsappUrl(waMsg)}
        target="_blank"
        rel="noreferrer"
        data-analytics="reserve-calc"
      >
        {t("nav_reserve", locale)}
      </a>
      <p style={{ fontSize: 12, color: "rgba(10,36,33,.55)", marginTop: 10, textAlign: "center" }}>
        {locale === "es"
          ? "Reserva ahora, paga el resto despues."
          : "Reserve now, pay the rest later."}
      </p>
    </div>
  );
}
