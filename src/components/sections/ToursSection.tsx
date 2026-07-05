"use client";

import Link from "next/link";
import { useState } from "react";
import { toursOnly } from "@/content/tours";
import { useLocale } from "@/lib/locale-context";
import { t, type DictKey } from "@/lib/i18n";
import TourCard from "@/components/tour/TourCard";

const FILTERS: Array<{ key: string; label: DictKey }> = [
  { key: "all", label: "filter_all" },
  { key: "sunset", label: "filter_sunset" },
  { key: "islands", label: "filter_islands" },
  { key: "celebration", label: "filter_celebration" },
  { key: "custom", label: "filter_custom" },
];

export default function ToursSection() {
  const { locale } = useLocale();
  const [active, setActive] = useState("all");

  return (
    <section id="travesias" className="section">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("tours_eyebrow", locale)}</p>
          <h2>{t("tours_title", locale)}</h2>
          <p>{t("tours_lede", locale)}</p>
        </div>

        <div className="filters" role="tablist" aria-label="Filtrar tours">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter${active === f.key ? " is-active" : ""}`}
              onClick={() => setActive(f.key)}
            >
              {t(f.label, locale)}
            </button>
          ))}
          <Link
            href="/compare"
            className="filter"
            style={{ marginLeft: "auto", borderColor: "var(--gold)", color: "var(--gold)" }}
          >
            {t("compare", locale)}
          </Link>
        </div>

        <div className="charter-grid">
          {toursOnly
            .filter((tour) => active === "all" || tour.categories.includes(active as never))
            .map((tour) => (
              <TourCard key={tour.slug} tour={tour} urgency />
            ))}
        </div>
      </div>
    </section>
  );
}
