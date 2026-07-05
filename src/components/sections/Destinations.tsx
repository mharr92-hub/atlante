"use client";

import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";

const destinations = [
  {
    h: { es: "Taboga, la isla de las flores", en: "Taboga, the island of flowers" },
    p: {
      es: "A 12 millas nauticas de Amador. Anclajes tranquilos, almuerzo y regreso antes de la brisa.",
      en: "Twelve nautical miles from Amador. Calm anchorages, lunch and return before the breeze.",
    },
  },
  {
    h: { es: "Las Perlas", en: "Las Perlas" },
    p: {
      es: "Contadora para llegar; Saboga y Mogo Mogo para anclar, snorkelear y desaparecer.",
      en: "Contadora to arrive; Saboga and Mogo Mogo to anchor, snorkel and disappear.",
    },
  },
  {
    h: { es: "Bahia de Panama al atardecer", en: "Bay of Panama at sunset" },
    p: {
      es: "Tres horas costeando el skyline y el Puente de las Americas, sin agenda y con buena luz.",
      en: "Three hours cruising the skyline and the Bridge of the Americas, no agenda and great light.",
    },
  },
];

export default function Destinations() {
  const { locale } = useLocale();
  return (
    <section id="destinos" className="section section-ivory">
      <div className="section-inner split">
        <div>
          <p className="eyebrow">{t("destinos_eyebrow", locale)}</p>
          <h2>{t("destinos_title", locale)}</h2>
        </div>
        <div className="destination-list">
          {destinations.map((d) => (
            <article key={d.h.en}>
              <h3>{L(d.h, locale)}</h3>
              <p>{L(d.p, locale)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
