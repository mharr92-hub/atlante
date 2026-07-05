"use client";

import { chartersOnly } from "@/content/tours";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import TourCard from "@/components/tour/TourCard";

export default function ChartersSection() {
  const { locale } = useLocale();
  return (
    <section id="charters" className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("charters_eyebrow", locale)}</p>
          <h2>{t("charters_title", locale)}</h2>
          <p>{t("charters_lede", locale)}</p>
        </div>
        <div className="charter-grid">
          {chartersOnly.map((tour) => (
            <TourCard key={tour.slug} tour={tour} light />
          ))}
        </div>
      </div>
    </section>
  );
}
