"use client";

import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";

export default function About() {
  const { locale } = useLocale();
  const quote = {
    es: "Nos dieron el barco correcto antes de saber que pedir.",
    en: "They gave us the right boat before we knew what to ask for.",
  };
  const who = { es: "Charter a Taboga - 8 invitados", en: "Taboga charter - 8 guests" };
  return (
    <section id="nosotros" className="section">
      <div className="section-inner about-panel">
        <p className="eyebrow">{t("about_eyebrow", locale)}</p>
        <h2>{t("about_title", locale)}</h2>
        <p>{t("about_body", locale)}</p>
        <div className="quote">
          <span>&ldquo;</span>
          <p>{L(quote, locale)}</p>
          <small>{L(who, locale)}</small>
        </div>
      </div>
    </section>
  );
}
