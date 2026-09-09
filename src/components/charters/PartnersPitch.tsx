"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import PexDisclosure from "@/components/site/PexDisclosure";

/** `/aliados` (bloque 4.2): las tres formas de trabajar con Atlante. */
export default function PartnersPitch() {
  const { locale } = useLocale();

  const cards = [
    {
      key: "operators",
      title: t("partners_operators_title", locale),
      body: t("partners_operators_body", locale),
    },
    {
      key: "hotels",
      title: t("partners_hotels_title", locale),
      body: t("partners_hotels_body", locale),
    },
    {
      key: "agencies",
      title: t("partners_agencies_title", locale),
      body: t("partners_agencies_body", locale),
    },
  ];

  return (
    <section className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("partners_eyebrow", locale)}</p>
          <h1>{t("partners_title", locale)}</h1>
          <p>{t("partners_lede", locale)}</p>
        </div>

        <div className="partner-grid">
          {cards.map((card) => (
            <article className="light-card partner-card" key={card.key}>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </div>

        <p className="fact partner-commission">{t("partners_commission_note", locale)}</p>

        <div className="section-more">
          <Link className="button button-primary" href="/aliados/registro">
            {t("partners_cta", locale)}
          </Link>
        </div>

        <div style={{ marginTop: 24 }}>
          <PexDisclosure variant="inline" tone="light" />
        </div>
      </div>
    </section>
  );
}
