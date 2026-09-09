"use client";

import Link from "@/components/site/LocaleLink";
import type { Operator, Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { t, tf, vesselTypeLabel } from "@/lib/i18n";
import CharterForm from "@/components/charters/CharterForm";

/**
 * `/cotizar/[slug]` (bloque 4.2): cierre de las naves aliadas.
 *
 * El formulario crea un lead `charter_partner` en estado `quote_requested` y
 * abre el WhatsApp de Atlante con el resumen. Hoy ninguna nave usa este modo
 * —las tres de PEX cierran en su checkout—, pero la ruta queda lista para el
 * primer operador aliado.
 */
export default function QuoteScreen({
  vessel,
  operator,
}: {
  vessel: Vessel;
  operator: Operator | null;
}) {
  const { locale } = useLocale();

  return (
    <section className="section section-ivory">
      <div className="section-inner quote-layout">
        <div>
          <Link href={`/charters/${vessel.slug}`} className="back-link">
            ← {t("back_charters", locale)}
          </Link>
          <h1>{tf("quote_title", locale, { name: vessel.name })}</h1>
          <p className="lede">{t("quote_lede", locale)}</p>
          <p className="fact">
            {vesselTypeLabel(vessel.type, locale)}
            {" · "}
            {tf("up_to_people", locale, { n: vessel.capacityMax })}
            {" · "}
            {vessel.marina}
          </p>
          {operator ? (
            <p className="fact">
              {t("vessel_operator", locale)}: {operator.name}
            </p>
          ) : null}
        </div>

        <CharterForm vessel={vessel} />
      </div>
    </section>
  );
}
