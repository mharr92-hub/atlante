"use client";

import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";

const items = [
  {
    fact: { es: "Barco completo para tu grupo", en: "Whole boat for your group" },
    h: { es: "Privado.", en: "Private." },
    p: {
      es: "Pacific Ferry y Sirena del Mar se alquilan completos. Tu grupo elige fecha, horas y ritmo.",
      en: "Pacific Ferry and Sirena del Mar are chartered whole. Your group picks date, hours and pace.",
    },
  },
  {
    fact: { es: "Solicitud con abono 30%", en: "Request with 30% deposit" },
    h: { es: "Claro.", en: "Clear." },
    p: {
      es: "El abono confirma la solicitud, no la reserva. Validamos disponibilidad en un máximo de 24 horas.",
      en: "The deposit confirms the request, not the reservation. We validate availability within 24 hours.",
    },
  },
  {
    fact: { es: "Concierge por WhatsApp", en: "Concierge on WhatsApp" },
    h: { es: "Cerca.", en: "Close." },
    p: {
      es: "Te confirmamos por WhatsApp. Si la fecha no sirve, alternativa o devolución del 100% del abono.",
      en: "We confirm on WhatsApp. If the date does not work, an alternative or a 100% deposit refund.",
    },
  },
];

export default function ValueProps() {
  const { locale } = useLocale();
  return (
    <section className="section section-ivory">
      <div className="section-inner three-up">
        {items.map((it) => (
          <article key={it.h.en}>
            <p className="fact">{L(it.fact, locale)}</p>
            <h2>{L(it.h, locale)}</h2>
            <p>{L(it.p, locale)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
