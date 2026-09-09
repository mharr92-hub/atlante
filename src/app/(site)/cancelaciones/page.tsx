import type { Metadata } from "next";
import { cookies } from "next/headers";
import { L, type Locale } from "@/lib/i18n";
import { buildPexUrl, PEX_BRAND, PEX_DOMAIN_LABEL } from "@/lib/pex";
import LegalShell from "@/components/site/LegalShell";

export const metadata: Metadata = {
  title: "Cancelaciones y reembolsos",
  description:
    "Las políticas de cancelación y reembolso las fija el operador. Aquí explicamos dónde consultarlas para cada tipo de experiencia.",
  alternates: { canonical: "/cancelaciones" },
};

const copy = {
  title: { es: "Cancelaciones y reembolsos", en: "Cancellations and refunds" },
  intro: {
    es: "Atlante no cobra y no emite reembolsos: la política que aplica es siempre la del operador que presta el servicio y recibe el pago.",
    en: "Atlante does not charge and does not issue refunds: the policy that applies is always that of the operator who provides the service and receives the payment.",
  },
  pexHead: { es: `Productos de ${PEX_BRAND}`, en: `${PEX_BRAND} products` },
  pexLead: {
    es: `Para las experiencias de ${PEX_BRAND} aplican las políticas publicadas en `,
    en: `For ${PEX_BRAND} experiences, the policies published on `,
  },
  pexLeadTail: {
    es: ". Según lo publicado por Pacific Experience el 09/09/2026:",
    en: ". As published by Pacific Experience on 09/09/2026:",
  },
  pexItems: [
    {
      es: "Charters: se reserva con 30 % de abono y el 70 % restante se paga 24 h antes de navegar; hay reembolso completo dentro de las primeras 24 h tras pagar el abono.",
      en: "Charters: booked with a 30 % deposit and the remaining 70 % paid 24 h before sailing; full refund within the first 24 h after paying the deposit.",
    },
    {
      es: "Tours compartidos: se pagan 100 % al reservar.",
      en: "Shared tours: paid 100 % at booking.",
    },
  ],
  partnerHead: { es: "Operadores aliados", en: "Partner operators" },
  partnerBody: {
    es: "Cada operador aliado fija su propia política de cancelación y reembolso. La política que aplica se muestra en la ficha de la nave o de la experiencia antes de que envíes tu solicitud.",
    en: "Each partner operator sets its own cancellation and refund policy. The applicable policy is shown on the vessel or experience listing before you send your request.",
  },
  weatherHead: { es: "Si el clima impide navegar", en: "If the weather prevents sailing" },
  weatherBody: {
    es: "La decisión de zarpar es del capitán y del operador, igual que la alternativa que ofrezcan (reprogramar o reembolsar). Atlante te acompaña en la gestión, pero no decide ni paga.",
    en: "The decision to sail belongs to the captain and the operator, as does the alternative they offer (reschedule or refund). Atlante helps you manage it, but neither decides nor pays.",
  },
} as const;

export default async function CancelacionesPage() {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("locale")?.value === "en" ? "en" : "es";

  return (
    <LegalShell locale={locale} title={L(copy.title, locale)}>
      <p>{L(copy.intro, locale)}</p>

      <section>
        <h2>{L(copy.pexHead, locale)}</h2>
        <p>
          {L(copy.pexLead, locale)}
          {/* PENDIENTE MARK: no está verificado que exista /politicas en PEX,
              así que enlazamos al inicio para no publicar un enlace roto. */}
          <a
            href={buildPexUrl({ target: "home", campaign: "cancelaciones" })}
            target="_blank"
            rel="noreferrer"
          >
            {PEX_DOMAIN_LABEL}
          </a>
          {L(copy.pexLeadTail, locale)}
        </p>
        <ul>
          {copy.pexItems.map((it) => (
            <li key={it.en}>{L(it, locale)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{L(copy.partnerHead, locale)}</h2>
        <p>{L(copy.partnerBody, locale)}</p>
      </section>

      <section>
        <h2>{L(copy.weatherHead, locale)}</h2>
        <p>{L(copy.weatherBody, locale)}</p>
      </section>
    </LegalShell>
  );
}
