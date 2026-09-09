import type { Metadata } from "next";
import { site, whatsappGreeting, whatsappUrl } from "@/config/site";
import { L, t } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";
import { PEX_BRAND } from "@/lib/pex";
import LegalShell from "@/components/site/LegalShell";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("meta_terms_title", locale),
    description: t("meta_terms_desc", locale),
    alternates: await pageAlternates("/terminos"),
  };
}

const copy = {
  title: { es: "Términos y condiciones", en: "Terms and conditions" },
  blocks: [
    {
      h: { es: "Qué hace Atlante", en: "What Atlante does" },
      p: [
        {
          es: `Atlante del Pacífico es un intermediario: comparamos ferry, tours y charters de operadores verificados, te ayudamos a elegir y te llevamos al operador para que completes la reserva. No operamos embarcaciones.`,
          en: `Atlante del Pacífico is an intermediary: we compare ferries, tours and charters from verified operators, help you choose, and take you to the operator so you can complete the booking. We do not operate vessels.`,
        },
      ],
    },
    {
      h: { es: "Quién presta el servicio y quién cobra", en: "Who provides the service and who charges" },
      p: [
        {
          es: `El servicio lo presta y lo cobra el operador: ${PEX_BRAND} o el operador aliado que aparezca en la ficha de la experiencia. El contrato de transporte o de alquiler se celebra entre tú y ese operador, que responde por la embarcación, la tripulación, la licencia y el seguro.`,
          en: `The service is provided and charged by the operator: ${PEX_BRAND} or the partner operator shown on the experience listing. The transport or charter contract is between you and that operator, who is responsible for the vessel, the crew, the licence and the insurance.`,
        },
      ],
    },
    {
      h: { es: "Condiciones de cada reserva", en: "Conditions of each booking" },
      p: [
        {
          es: `Las condiciones de precio, horario, cupos, cambios y cancelación son las del operador y son las que aparecen en su propio sitio al momento de pagar. Si algo que ves en Atlante no coincide con lo que ves en el operador, manda el operador: avísanos y lo corregimos.`,
          en: `Price, schedule, capacity, changes and cancellation conditions are the operator's, and are the ones shown on their own site at the time of payment. If something you see on Atlante does not match the operator, the operator prevails: tell us and we will correct it.`,
        },
      ],
    },
    {
      h: { es: "Atlante nunca cobra", en: "Atlante never charges" },
      p: [
        {
          es: `Atlante no procesa pagos, no tiene pasarela de pago y no solicita ni guarda datos de tarjeta. Cualquier página que te pida un número de tarjeta a nombre de Atlante del Pacífico no es nuestra.`,
          en: `Atlante does not process payments, has no payment gateway and neither requests nor stores card data. Any page asking for a card number on behalf of Atlante del Pacífico is not ours.`,
        },
      ],
    },
  ],
  contact: {
    h: { es: "Contacto", en: "Contact" },
    p: {
      es: "Para dudas sobre estos términos escríbenos por WhatsApp al ",
      en: "For questions about these terms, message us on WhatsApp at ",
    },
  },
} as const;

export default async function TerminosPage() {
  const locale = await getLocale();

  return (
    <LegalShell locale={locale} title={L(copy.title, locale)}>
      {copy.blocks.map((b) => (
        <section key={b.h.en}>
          <h2>{L(b.h, locale)}</h2>
          {b.p.map((p, i) => (
            <p key={i}>{L(p, locale)}</p>
          ))}
        </section>
      ))}
      <section>
        <h2>{L(copy.contact.h, locale)}</h2>
        <p>
          {L(copy.contact.p, locale)}
          <a
            href={whatsappUrl(whatsappGreeting(locale))}
            target="_blank"
            rel="noreferrer"
          >
            {site.whatsapp.display}
          </a>
          .
        </p>
      </section>
    </LegalShell>
  );
}
