"use client";

import Link from "next/link";
import { site, whatsappUrl } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function Hero() {
  const { locale } = useLocale();
  return (
    <section id="inicio" className="hero">
      <div className="hero-media" role="img" aria-label="Embarcacion privada en el Pacifico de Panama" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">{t("hero_eyebrow", locale)}</p>
        <h1>{t("hero_title", locale)}</h1>
        <p className="lede">{t("hero_lede", locale)}</p>

        <div className="hero-products" role="tablist" aria-label="Productos">
          <Link className="hero-product is-active" href="/charters">
            {t("hero_product_charters", locale)}
          </Link>
          <span className="hero-product is-soon">
            {t("hero_product_ferry", locale)}
            <small>{t("coming_soon", locale)}</small>
          </span>
          <span className="hero-product is-soon">
            {t("hero_product_tours", locale)}
            <small>{t("coming_soon", locale)}</small>
          </span>
        </div>

        <div className="hero-actions">
          <Link className="button button-primary" href="/charters">
            {t("hero_cta_tours", locale)}
          </Link>
          <a className="button button-ghost" href={whatsappUrl()} target="_blank" rel="noreferrer">
            {t("hero_cta_whatsapp", locale)}
          </a>
        </div>
        <div className="trust-row" aria-label="Indicadores de confianza">
          <span>
            <strong>{site.trust.googleRating}</strong> Google
          </span>
          <span>
            <strong>{site.trust.reviewCount}</strong> {t("trust_reviews", locale)}
          </span>
          <span>
            <strong>+{site.trust.experiences}</strong> {t("trust_experiences", locale)}
          </span>
          <span>
            <strong>{site.trust.avgResponseMinutes} min</strong> {t("trust_response", locale)}
          </span>
        </div>
      </div>
    </section>
  );
}
