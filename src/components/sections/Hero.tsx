"use client";

import Link from "@/components/site/LocaleLink";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function Hero() {
  const { locale } = useLocale();
  return (
    <section id="inicio" className="hero">
      <div className="hero-media" role="img" aria-label={t("hero_media_alt", locale)} />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">{t("hero_eyebrow", locale)}</p>
        <h1>{t("hero_title", locale)}</h1>
        <p className="lede">{t("hero_lede", locale)}</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/tours">
            {t("hero_cta_tours", locale)}
          </Link>
          <Link className="button button-ghost" href="/charters">
            {t("hero_cta_charters", locale)}
          </Link>
        </div>
      </div>
    </section>
  );
}
