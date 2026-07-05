"use client";

import Link from "next/link";
import type { Tour } from "@/content/tours";
import { useLocale } from "@/lib/locale-context";
import { useCurrency } from "@/lib/currency-context";
import { L, t } from "@/lib/i18n";
import { money } from "@/lib/format";
import { whatsappUrl } from "@/config/site";
import Badges from "@/components/tour/Badges";

export default function TourCard({
  tour,
  light = false,
  urgency = false,
}: {
  tour: Tour;
  light?: boolean;
  urgency?: boolean;
}) {
  const { locale } = useLocale();
  const { currency } = useCurrency();
  const isCharter = tour.kind === "charter";
  const priceLabel = tour.pricing.model === "perPerson" ? t("per_person", locale) : t("per_boat", locale);
  const waMsg =
    locale === "es"
      ? `Hola Atlante, quiero informacion sobre ${L(tour.name, "es")}.`
      : `Hi Atlante, I'd like info about ${L(tour.name, "en")}.`;

  return (
    <article
      className={`charter-card${light ? " light-card" : ""}`}
      data-category={tour.categories.join(" ")}
    >
      <Link href={`/tours/${tour.slug}`} className={`card-image ${tour.cardCrop}`} aria-label={L(tour.name, locale)} />
      <p className="fact">
        {L(tour.duration, locale)} · {t("from", locale)} {money(tour.pricing.priceFrom, currency)} {priceLabel}
      </p>
      <Badges badges={tour.badges} />
      {urgency ? <span className="urgency">{t("spots_left", locale)}</span> : null}
      <h3 style={{ marginTop: 10 }}>{L(tour.name, locale)}</h3>
      <p className="card-body-text">{L(tour.summary, locale)}</p>
      <div className="card-actions">
        <Link className="card-link" href={`/tours/${tour.slug}`}>
          {t("view_detail", locale)}
        </Link>
        <a className="card-link" href={whatsappUrl(waMsg)} target="_blank" rel="noreferrer">
          {isCharter ? t("quote_charter", locale) : t("request_tour", locale)}
        </a>
      </div>
    </article>
  );
}
