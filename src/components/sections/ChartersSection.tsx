"use client";

import Link from "next/link";
import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import VesselCard from "@/components/catalog/VesselCard";

/** Home: las tres naves de Pacific Experience (llegan por prop, ver 3.2). */
export default function ChartersSection({ vessels }: { vessels: Product[] }) {
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
          {vessels.map((vessel) => (
            <VesselCard key={vessel.slug} vessel={vessel} />
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
