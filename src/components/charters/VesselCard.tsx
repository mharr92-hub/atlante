"use client";

import Link from "next/link";
import type { Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { t, tf, vesselTypeLabel } from "@/lib/i18n";
import { money } from "@/lib/format";
import { cheapestRow, pricePerPerson } from "@/lib/vessel-pricing";

/**
 * Tarjeta de nave del marketplace (bloque 4.2).
 *
 * El precio por persona se calcula con el tramo de capacidad que cubre al grupo
 * elegido; si ninguno lo cubre no se extrapola nada: se invita a consultar.
 */
export default function VesselCard({
  vessel,
  people,
  verified = false,
  compare,
}: {
  vessel: Vessel;
  /** Tamaño del grupo del control "¿Cuántas personas?". */
  people: number;
  /** Sello del operador; se calcula en el servidor. */
  verified?: boolean;
  compare?: { selected: boolean; disabled: boolean; onToggle: () => void };
}) {
  const { locale } = useLocale();
  const tier = cheapestRow(vessel);
  const perPerson = pricePerPerson(vessel, { people });
  const href = `/charters/${vessel.slug}`;

  return (
    <article className="charter-card light-card">
      <Link
        href={href}
        className="card-image"
        style={{ backgroundImage: `url(${vessel.photos[0]})` }}
        aria-label={vessel.name}
      />
      <div className="card-kind">
        {vessel.closeMode === "deeplink" ? t("badge_direct", locale) : t("badge_quote", locale)}
      </div>
      <h3 style={{ marginTop: 10 }}>
        <Link href={href}>{vessel.name}</Link>
      </h3>
      {verified ? <p className="vessel-seal">✓ {t("operator_verified", locale)}</p> : null}

      <p className="card-price">
        {tier
          ? tf("from_boat_tier", locale, {
              price: money(tier.price),
              hours: tier.hours,
              cap: tier.capacityMax,
            })
          : t("on_request", locale)}
      </p>
      <p className="card-price card-price-person">
        {perPerson !== null
          ? `${tf("per_person_from", locale, { price: money(perPerson) })} · ${tf(
              "per_person_for_group",
              locale,
              { n: people },
            )}`
          : tf("no_price_for_group", locale, { n: people })}
      </p>

      <p className="fact">
        {vesselTypeLabel(vessel.type, locale)}
        {" · "}
        {tf("up_to_people", locale, { n: vessel.capacityMax })}
        {" · "}
        {vessel.marina}
      </p>

      <div className="card-actions">
        <Link className="button button-primary card-cta" href={href}>
          {t("view_detail", locale)}
        </Link>
        {compare ? (
          <button
            type="button"
            className={`compare-toggle${compare.selected ? " is-selected" : ""}`}
            aria-pressed={compare.selected}
            disabled={compare.disabled && !compare.selected}
            onClick={compare.onToggle}
          >
            {compare.selected ? t("compare_added", locale) : t("compare_add", locale)}
          </button>
        ) : null}
      </div>
    </article>
  );
}
