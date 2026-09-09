"use client";

import Link from "@/components/site/LocaleLink";
import type { Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import VesselCard from "@/components/charters/VesselCard";

/**
 * Home: las naves del marketplace con el precio por persona calculado para el
 * grupo por defecto (bloque 4.2). Llegan por prop desde el servidor.
 */
export default function ChartersSection({
  vessels,
  people,
  verified = [],
}: {
  vessels: Vessel[];
  /** Tamaño de grupo con el que se calcula el "desde $X por persona". */
  people: number;
  verified?: string[];
}) {
  const { locale } = useLocale();
  const sealed = new Set(verified);

  return (
    <section id="charters" className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("charters_eyebrow", locale)}</p>
          <h2>{t("charters_title", locale)}</h2>
          <p>{t("charters_marketplace_lede", locale)}</p>
        </div>
        <div className="charter-grid">
          {vessels.map((vessel) => (
            <VesselCard
              key={vessel.slug}
              vessel={vessel}
              people={people}
              verified={sealed.has(vessel.slug)}
            />
          ))}
        </div>
        <div className="section-more">
          <Link className="button button-ghost" href="/charters">
            {t("view_all_charters", locale)}
          </Link>
        </div>
      </div>
    </section>
  );
}
