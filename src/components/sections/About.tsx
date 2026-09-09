"use client";

import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function About() {
  const { locale } = useLocale();
  return (
    <section id="nosotros" className="section">
      <div className="section-inner about-panel">
        <p className="eyebrow">{t("about_eyebrow", locale)}</p>
        <h2>{t("about_title", locale)}</h2>
        <p>{t("about_body", locale)}</p>
      </div>
    </section>
  );
}
