"use client";

import Link from "next/link";
import { liveCharters } from "@/data/charters";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import CharterCard from "@/components/charter/CharterCard";

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
          {liveCharters.map((c) => (
            <CharterCard key={c.slug} charter={c} />
          ))}
        </div>
        <p style={{ marginTop: 28 }}>
          <Link className="card-link" href="/charters">
            {t("charters_view_all", locale)} →
          </Link>
        </p>
      </div>
    </section>
  );
}
