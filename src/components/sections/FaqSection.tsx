"use client";

import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";

const faqs = [
  {
    q: { es: "Como reservo un charter?", en: "How do I book a charter?" },
    a: {
      es: "Escribenos por WhatsApp o llena el formulario. Te pedimos fecha, cantidad de personas y ruta deseada para cotizar.",
      en: "Message us on WhatsApp or fill the form. We'll ask for the date, number of people and desired route to quote.",
    },
  },
  {
    q: { es: "Los tours y los charters son lo mismo?", en: "Are tours and charters the same?" },
    a: {
      es: "No. Un tour suele tener una experiencia y condiciones ya definidas. Un charter es la renta total de la embarcacion para tu grupo.",
      en: "No. A tour usually has a set experience and conditions. A charter is the whole-vessel rental for your group.",
    },
  },
  {
    q: { es: "Puedo personalizar el itinerario?", en: "Can I customize the itinerary?" },
    a: {
      es: "Si es charter, normalmente si. En tours depende de las reglas del operador y la disponibilidad.",
      en: "For a charter, usually yes. For tours it depends on the operator's rules and availability.",
    },
  },
  {
    q: { es: "Que pasa si cambia el clima?", en: "What if the weather changes?" },
    a: {
      es: "Si no es seguro, reprogramamos o cambiamos a un anclaje protegido.",
      en: "If it's not safe, we reschedule or move to a protected anchorage.",
    },
  },
];

export default function FaqSection() {
  const { locale } = useLocale();
  return (
    <section className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("faq_eyebrow", locale)}</p>
          <h2>{t("faq_title", locale)}</h2>
        </div>
        <div className="faq-list">
          {faqs.map((f) => (
            <details key={f.q.en}>
              <summary>{L(f.q, locale)}</summary>
              <p>{L(f.a, locale)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
