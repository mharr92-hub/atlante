"use client";

import Link from "next/link";
import type { Charter } from "@/data/charters";
import { DEPOSIT_PERCENT } from "@/data/charters";
import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";
import { money } from "@/lib/format";
import { useCurrency } from "@/lib/currency-context";

export default function CharterCard({ charter }: { charter: Charter }) {
  const { locale } = useLocale();
  const { currency } = useCurrency();
  const live = charter.status === "live";
  const from = charter.citedRangeUsd?.from;
  const durations = charter.durations.map((d) => `${d.hours}h`).join(" · ");

  return (
    <article className={`charter-card light-card${live ? "" : " is-soon"}`}>
      <div
        className={`card-image ${charter.cardCrop}`}
        role="img"
        aria-hidden
        style={{ backgroundImage: `linear-gradient(rgba(10,36,33,.18),rgba(10,36,33,.45)), url(${charter.heroImage})` }}
      />
      <p className="fact">
        {live
          ? `${charter.maxPax ? (locale === "es" ? `Hasta ~${charter.maxPax} personas` : `Up to ~${charter.maxPax} guests`) : ""} · ${durations}`
          : locale === "es"
            ? "Próximamente"
            : "Coming soon"}
      </p>
      <h3 style={{ marginTop: 10 }}>{L(charter.name, locale)}</h3>
      <p className="card-body-text">{L(charter.summary, locale)}</p>
      {live && from != null ? (
        <p className="card-price">
          {locale === "es" ? "Desde" : "From"} {money(from, currency)}
          <small>
            {locale === "es"
              ? `Precio de referencia · ${DEPOSIT_PERCENT}% abono`
              : `Reference price · ${DEPOSIT_PERCENT}% deposit`}
          </small>
        </p>
      ) : (
        <p className="card-price muted">
          {locale === "es" ? "Tarifas al publicar ficha" : "Rates when the listing goes live"}
        </p>
      )}
      <div className="card-actions">
        {live ? (
          <Link className="card-link" href={`/charters/${charter.slug}`}>
            {locale === "es" ? "Ver y reservar" : "View and book"}
          </Link>
        ) : (
          <span className="card-link is-disabled">
            {locale === "es" ? "Próximamente" : "Coming soon"}
          </span>
        )}
      </div>
    </article>
  );
}
