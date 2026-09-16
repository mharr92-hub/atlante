"use client";

import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";

const faqs = [
  {
    q: { es: "Como reservo un charter?", en: "How do I book a charter?" },
    a: {
      es: "Elige la nave, llena nombre, WhatsApp, fecha, horas y personas, y paga el 30% de abono. El abono confirma la solicitud, no la reserva: verificamos disponibilidad en un máximo de 24 horas y te escribimos por WhatsApp.",
      en: "Pick the boat, fill name, WhatsApp, date, hours and guests, and pay a 30% deposit. The deposit confirms the request, not the reservation: we check availability within 24 hours and message you on WhatsApp.",
    },
  },
  {
    q: { es: "Que pasa si la fecha no esta disponible?", en: "What if the date is not available?" },
    a: {
      es: "Te ofrecemos una fecha o nave alternativa. Si ninguna te sirve, te devolvemos el 100% del abono.",
      en: "We offer an alternative date or boat. If none work for you, we refund 100% of the deposit.",
    },
  },
  {
    q: { es: "Hay calendario en vivo?", en: "Is there a live calendar?" },
    a: {
      es: "No en este lanzamiento. No inventamos inventario para toda la flota: la confirmacion es operativa, en 24 horas.",
      en: "Not in this launch. We are not inventing inventory for the whole fleet: confirmation is operational, within 24 hours.",
    },
  },
  {
    q: { es: "Ferry y tours estan a la venta?", en: "Are ferry and tours on sale?" },
    a: {
      es: "Todavia no. Esos productos estan como Proximamente. Lo que esta vivo hoy es charter privado.",
      en: "Not yet. Those products are Coming soon. What is live today is private charter.",
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
