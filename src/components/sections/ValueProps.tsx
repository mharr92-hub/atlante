"use client";

import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";

const items = [
  {
    fact: { es: "Tours con operador aliado", en: "Tours with partner operators" },
    h: { es: "Curado.", en: "Curated." },
    p: {
      es: "Filtramos rutas, tiempos y estilo de experiencia para que no tengas que comparar a ciegas.",
      en: "We filter routes, timing and experience style so you don't have to compare blindly.",
    },
  },
  {
    fact: { es: "Yate completo para tu grupo", en: "Whole yacht for your group" },
    h: { es: "Privado.", en: "Private." },
    p: {
      es: "Cuando quieres control total, armamos una propuesta de charter completo con ruta y horario a medida.",
      en: "When you want full control, we build a whole-charter proposal with a custom route and schedule.",
    },
  },
  {
    fact: { es: "Concierge desde el primer mensaje", en: "Concierge from the first message" },
    h: { es: "Sin esfuerzo.", en: "Effortless." },
    p: {
      es: "Nos cuentas fecha, grupo y plan ideal. Te respondemos con opciones concretas y el siguiente paso.",
      en: "Tell us the date, group and ideal plan. We reply with concrete options and the next step.",
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
