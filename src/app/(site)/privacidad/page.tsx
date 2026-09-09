import type { Metadata } from "next";
import { site, whatsappGreeting, whatsappUrl } from "@/config/site";
import { L, t } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";
import { PEX_BRAND } from "@/lib/pex";
import LegalShell from "@/components/site/LegalShell";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("meta_privacy_title", locale),
    description: t("meta_privacy_desc", locale),
    alternates: await pageAlternates("/privacidad"),
  };
}

const copy = {
  title: { es: "Política de privacidad", en: "Privacy policy" },
  blocks: [
    {
      h: { es: "Qué datos pedimos", en: "What data we ask for" },
      p: [
        {
          es: "Para gestionar una solicitud te pedimos: nombre, número de WhatsApp, correo electrónico, fecha del servicio y cantidad de pasajeros. No pedimos datos de tarjeta ni datos bancarios: Atlante nunca cobra.",
          en: "To handle a request we ask for: name, WhatsApp number, email address, service date and number of passengers. We do not ask for card or bank details: Atlante never charges.",
        },
      ],
    },
    {
      h: { es: "Para qué los usamos", en: "What we use them for" },
      p: [
        {
          es: `Los usamos para gestionar tu solicitud (responderte, confirmar disponibilidad y armar la propuesta) y para transferirlos al operador —${PEX_BRAND} o el operador aliado de la ficha— para que puedas completar la reserva con él. No vendemos tus datos ni los cedemos a terceros con otro fin.`,
          en: `We use them to handle your request (reply, confirm availability and put the proposal together) and to transfer them to the operator —${PEX_BRAND} or the partner operator on the listing— so you can complete the booking with them. We do not sell your data or pass it to third parties for any other purpose.`,
        },
        {
          es: "Tu nombre, correo y teléfono nunca viajan en la dirección web hacia el operador.",
          en: "Your name, email and phone never travel in the web address towards the operator.",
        },
      ],
    },
    {
      h: { es: "Cookies y analítica", en: "Cookies and analytics" },
      p: [
        {
          es: "Usamos una cookie para recordar tu idioma (español o inglés). Cuando estén activas, usaremos también Google Analytics 4 y el píxel de Meta para medir cuántas personas visitan el sitio y cuántas llegan al operador; hoy sólo se cargan si el sitio tiene configurados sus identificadores.",
          en: "We use a cookie to remember your language (Spanish or English). When enabled, we will also use Google Analytics 4 and the Meta pixel to measure how many people visit the site and how many reach the operator; today they only load if the site has their identifiers configured.",
        },
      ],
    },
    {
      h: { es: "Corrección y borrado", en: "Correction and deletion" },
      p: [
        {
          es: "Puedes pedirnos que corrijamos o borremos tus datos escribiéndonos por WhatsApp. Ten en cuenta que si ya reservaste con el operador, sus datos de reserva los gestiona el operador y hay que pedírselo a él.",
          en: "You can ask us to correct or delete your data by messaging us on WhatsApp. Note that if you already booked with the operator, that booking data is held by the operator and must be requested from them.",
        },
      ],
    },
  ],
  contact: {
    h: { es: "Contacto", en: "Contact" },
    p: {
      es: "Escríbenos por WhatsApp al ",
      en: "Message us on WhatsApp at ",
    },
  },
} as const;

export default async function PrivacidadPage() {
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
