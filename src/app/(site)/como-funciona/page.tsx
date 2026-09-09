import type { Metadata } from "next";
import { cookies } from "next/headers";
import { L, type Locale } from "@/lib/i18n";
import { ATLANTE_REF_CODE, PEX_BRAND, PEX_DOMAIN_LABEL, buildPexUrl } from "@/lib/pex";
import LegalShell from "@/components/site/LegalShell";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Eliges tu experiencia, escoges fecha y pasajeros, dejas tus datos y completas el pago directo con el operador. Atlante nunca cobra.",
  alternates: { canonical: "/como-funciona" },
};

const copy = {
  title: { es: "Cómo funciona", en: "How it works" },
  intro: {
    es: "Atlante compara ferry, tours y charters de operadores verificados y te lleva al pago directo con el operador. Son tres pasos.",
    en: "Atlante compares ferries, tours and charters from verified operators and takes you straight to paying the operator. It takes three steps.",
  },
  steps: [
    {
      n: "1",
      h: { es: "Eliges tu experiencia", en: "You choose your experience" },
      p: {
        es: "Ferry, tour o charter completo. Cada ficha dice quién opera la embarcación y quién te va a cobrar.",
        en: "Ferry, tour or whole-vessel charter. Every listing says who operates the vessel and who will charge you.",
      },
    },
    {
      n: "2",
      h: { es: "Fecha y pasajeros", en: "Date and passengers" },
      p: {
        es: "Escoges el día y cuántas personas van. La disponibilidad final la confirma el operador.",
        en: "You pick the day and how many people are coming. Final availability is confirmed by the operator.",
      },
    },
    {
      n: "3",
      h: { es: "Tus datos", en: "Your details" },
      p: {
        es: "Nombre, WhatsApp y correo, para poder acompañarte si algo falla en el camino. Nada de esto viaja en la dirección web.",
        en: "Name, WhatsApp and email, so we can help if something goes wrong along the way. None of this travels in the web address.",
      },
    },
  ],
  payHead: { es: "El pago", en: "Payment" },
  payBody: {
    es: `El pago se completa en ${PEX_DOMAIN_LABEL}, el sitio de ${PEX_BRAND}, o con el operador aliado que corresponda. Atlante nunca cobra, no tiene pasarela de pago y no pide datos de tarjeta.`,
    en: `Payment is completed on ${PEX_DOMAIN_LABEL}, the ${PEX_BRAND} site, or with the relevant partner operator. Atlante never charges, has no payment gateway and does not ask for card details.`,
  },
  codeHead: { es: "El código de referido", en: "The referral code" },
  codeBody: {
    es: `Cuando te llevamos al operador viaja nuestro código de referido, ${ATLANTE_REF_CODE}. Si el formulario del operador te pide un "código de referido", pega ${ATLANTE_REF_CODE}. No te cambia el precio: es lo que nos permite saber que la reserva salió de aquí.`,
    en: `When we take you to the operator, our referral code, ${ATLANTE_REF_CODE}, travels with you. If the operator's form asks for a "referral code", paste ${ATLANTE_REF_CODE}. It does not change your price: it is how we know the booking came from here.`,
  },
  linkLabel: { es: "Ir a ", en: "Go to " },
} as const;

export default async function ComoFuncionaPage() {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("locale")?.value === "en" ? "en" : "es";

  return (
    <LegalShell locale={locale} title={L(copy.title, locale)}>
      <p>{L(copy.intro, locale)}</p>

      {copy.steps.map((s) => (
        <section key={s.n}>
          <h2>
            {s.n}. {L(s.h, locale)}
          </h2>
          <p>{L(s.p, locale)}</p>
        </section>
      ))}

      <section>
        <h2>{L(copy.payHead, locale)}</h2>
        <p>{L(copy.payBody, locale)}</p>
        <p>
          <a
            href={buildPexUrl({ target: "home", campaign: "como-funciona" })}
            target="_blank"
            rel="noreferrer"
          >
            {L(copy.linkLabel, locale)}
            {PEX_DOMAIN_LABEL}
          </a>
        </p>
      </section>

      <section>
        <h2>{L(copy.codeHead, locale)}</h2>
        <p>{L(copy.codeBody, locale)}</p>
      </section>
    </LegalShell>
  );
}
