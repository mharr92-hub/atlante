"use client";

import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { L, t, tf } from "@/lib/i18n";
import { money } from "@/lib/format";
import { buildPexUrl } from "@/lib/pex";
import { site, whatsappUrl } from "@/config/site";
import { track } from "@/lib/analytics";

/**
 * Tarjeta de nave de Pacific Experience.
 *
 * En el bloque 2 el cierre es directo en el checkout de PEX (sin lead: la
 * captura para charters llega en el bloque 4), así que el CTA es un enlace
 * construido con `buildPexUrl` para no perder `ref=ATLANTE`.
 */
export default function VesselCard({ vessel }: { vessel: Product }) {
  const { locale } = useLocale();
  const checkoutUrl = buildPexUrl({
    target: "charter_checkout",
    vessel: vessel.pexCheckout?.kind === "charter" ? vessel.pexCheckout.vessel : undefined,
    campaign: vessel.slug,
  });
  const pageUrl = buildPexUrl({
    target: "charter_page",
    path: vessel.pexPath,
    campaign: vessel.slug,
  });
  const waMsg =
    locale === "es"
      ? `Hola Atlante, quiero consultar por el ${L(vessel.name, "es")}.`
      : `Hi Atlante, I'd like to ask about the ${L(vessel.name, "en")}.`;

  return (
    <article className="charter-card light-card">
      <a
        href={pageUrl}
        target="_blank"
        rel="noreferrer"
        className="card-image"
        style={{ backgroundImage: `url(${vessel.images[0]})` }}
        aria-label={L(vessel.name, locale)}
      />
      <div className="card-kind">{t("direct_booking_pex", locale)}</div>
      <h3 style={{ marginTop: 10 }}>{L(vessel.name, locale)}</h3>
      <p className="card-price">
        {t("per_boat", locale)} {t("from", locale)} {money(vessel.priceFrom)}
        {" · "}
        {vessel.pricePerPersonFrom
          ? `${t("from", locale)} ${money(vessel.pricePerPersonFrom)}/${
              locale === "es" ? "persona" : "person"
            }`
          : t("on_request", locale)}
      </p>
      <p className="fact">
        {L(vessel.durationLabel, locale)}
        {vessel.capacityMax ? ` · ${tf("up_to_people", locale, { n: vessel.capacityMax })}` : ""}
      </p>
      <p className="card-body-text">{L(vessel.summary, locale)}</p>
      <div className="card-actions">
        <a className="button button-primary card-cta" href={checkoutUrl} target="_blank" rel="noreferrer">
          {t("book_on_pex", locale)}
        </a>
        <a
          className="card-link"
          href={whatsappUrl(waMsg)}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("whatsapp_click", { context: `vessel:${vessel.slug}` })}
        >
          {site.whatsapp.display}
        </a>
        <a className="card-link" href={pageUrl} target="_blank" rel="noreferrer">
          {t("view_on_pex", locale)}
        </a>
      </div>
    </article>
  );
}
