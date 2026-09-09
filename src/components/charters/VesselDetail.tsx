"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { Operator, Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { L, formatDate, onRequestUnitLabel, routeLabel, t, tf, vesselTypeLabel } from "@/lib/i18n";
import { money } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cheapestRow, routesOf } from "@/lib/vessel-pricing";
import CharterForm from "@/components/charters/CharterForm";
import PexDisclosure from "@/components/site/PexDisclosure";

/**
 * Ficha estándar de nave (bloque 4.2): capacidad, marina, tabla de precios por
 * ruta / jornada / capacidad, incluye, bajo solicitud, apartado y cancelación,
 * galería y operador.
 *
 * El cierre depende del `closeMode`: formulario corto → checkout de PEX, o
 * cotización con el concierge de Atlante.
 */
export default function VesselDetail({
  vessel,
  operator,
  verified,
}: {
  vessel: Vessel;
  operator: Operator | null;
  /** Sello del operador; se calcula en el servidor con el checklist completo. */
  verified: boolean;
}) {
  const { locale } = useLocale();

  useEffect(() => {
    track("view_product", { slug: vessel.slug, kind: "vessel" });
  }, [vessel.slug]);

  const tier = cheapestRow(vessel);
  const routes = routesOf(vessel);
  const deeplink = vessel.closeMode === "deeplink";

  return (
    <>
      <section className="tour-hero">
        <div
          className="hero-media"
          style={{
            backgroundImage: `linear-gradient(rgba(10,36,33,.35),rgba(10,36,33,.7)), url(${vessel.photos[0]})`,
          }}
        />
        <div className="hero-overlay" />
        <div className="section-inner">
          <Link href="/charters" className="back-link">
            ← {t("back_charters", locale)}
          </Link>
          <p className="eyebrow" style={{ color: "var(--gold)" }}>
            {deeplink ? t("badge_direct", locale) : t("badge_quote", locale)}
          </p>
          <h1 style={{ fontSize: "clamp(34px,7vw,72px)" }}>{vessel.name}</h1>
          {vessel.summary ? <p className="lede">{L(vessel.summary, locale)}</p> : null}
        </div>
      </section>

      <section className="section section-ivory">
        <div className="section-inner tour-layout">
          <div>
            <div className="tour-block">
              <p className="fact">
                {vesselTypeLabel(vessel.type, locale)}
                {" · "}
                {tf("up_to_people", locale, { n: vessel.capacityMax })}
                {vessel.lengthFt ? ` · ${vessel.lengthFt} ft` : ""}
              </p>
              <p className="fact">
                {t("marina_label", locale)}: {vessel.marina}
              </p>
              {routes.length > 0 ? (
                <p className="fact">
                  {t("routes_label", locale)}:{" "}
                  {routes.map((route) => routeLabel(route, locale)).join(" · ")}
                </p>
              ) : null}
              {vessel.description ? (
                <p style={{ fontSize: 17, marginTop: 16 }}>{L(vessel.description, locale)}</p>
              ) : null}
            </div>

            <div className="tour-block">
              <h2>{t("price_table_title", locale)}</h2>
              {vessel.pricing.length > 0 ? (
                <div className="admin-table-wrap">
                  <table className="price-table vessel-price-table">
                    <thead>
                      <tr>
                        <th scope="col">{t("th_route", locale)}</th>
                        <th scope="col">{t("th_duration", locale)}</th>
                        <th scope="col">{t("th_capacity", locale)}</th>
                        <th scope="col">{t("th_boat_price", locale)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vessel.pricing.map((row, i) => (
                        <tr key={`${row.route}-${row.hours}-${row.capacityMax}-${i}`}>
                          <th scope="row">{routeLabel(row.route, locale)}</th>
                          <td>{tf("hours_n", locale, { n: row.hours })}</td>
                          <td>{tf("up_to_pax", locale, { n: row.capacityMax })}</td>
                          <td>{money(row.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="fact">{t("on_request", locale)}</p>
              )}
              {vessel.pexPricePerPersonFrom ? (
                <p className="price-note">
                  {tf("pex_publishes_per_person", locale, {
                    price: money(vessel.pexPricePerPersonFrom),
                  })}
                </p>
              ) : null}
            </div>

            <div className="tour-block">
              <h2>{t("included", locale)}</h2>
              <ul className="list-check">
                {vessel.includes.map((item, i) => (
                  <li key={i}>{L(item, locale)}</li>
                ))}
              </ul>
            </div>

            {vessel.onRequest.length > 0 ? (
              <div className="tour-block">
                <h2>{t("on_request_title", locale)}</h2>
                <ul className="list-check">
                  {vessel.onRequest.map((item, i) => (
                    <li key={i}>
                      {L(item.label, locale)}
                      {" · "}
                      {item.price ? (
                        <>
                          {money(item.price)}
                          {item.unit ? ` ${onRequestUnitLabel(item.unit, locale)}` : ""}
                        </>
                      ) : (
                        t("on_request_no_price", locale)
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="tour-block">
              <h2>{t("policies", locale)}</h2>
              <ul className="list-check">
                <li>
                  {t("deposit_label", locale)}: {tf("deposit_value", locale, { n: vessel.depositPct })}
                </li>
                <li>
                  {t("cancellation_label", locale)}: {L(vessel.cancellationPolicy, locale)}
                </li>
              </ul>
            </div>

            <div className="tour-block">
              <h2>{t("gallery", locale)}</h2>
              <div className="gallery-grid">
                {vessel.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`${vessel.name} ${i + 1}`} loading="lazy" />
                ))}
              </div>
              {vessel.verifiedAt ? (
                <p className="fact">
                  {t("verified_on", locale)} {formatDate(vessel.verifiedAt, locale)}
                </p>
              ) : null}
            </div>
          </div>

          <aside className="book-panel">
            {tier ? (
              <>
                <div className="price-big">{money(tier.price)}</div>
                <div className="price-sub">
                  {tf("from_boat_tier", locale, {
                    price: money(tier.price),
                    hours: tier.hours,
                    cap: tier.capacityMax,
                  })}
                </div>
              </>
            ) : (
              <div className="price-big">{t("on_request", locale)}</div>
            )}

            <p className="fact" style={{ marginTop: 12 }}>
              {t("vessel_operator", locale)}: {operator?.name ?? "—"}
            </p>
            {verified ? (
              <p className="vessel-seal">
                ✓ {t("operator_verified", locale)}
                <small>{t("operator_verified_note", locale)}</small>
              </p>
            ) : null}

            {deeplink ? (
              <a className="button button-primary" style={{ width: "100%", marginTop: 16 }} href="#reservar">
                {t("charter_form_title", locale)}
              </a>
            ) : (
              <Link
                className="button button-primary"
                style={{ width: "100%", marginTop: 16 }}
                href={`/cotizar/${vessel.slug}`}
              >
                {t("quote_cta", locale)}
              </Link>
            )}

            <p className="fact" style={{ marginTop: 12 }}>
              <Link href={`/charters/comparar?v=${vessel.slug}`}>{t("compare_add", locale)}</Link>
            </p>

            <div style={{ marginTop: 18, borderTop: "1px solid rgba(10,36,33,.14)", paddingTop: 16 }}>
              <PexDisclosure variant="inline" tone="light" />
            </div>
          </aside>
        </div>

        {deeplink ? (
          <div className="section-inner charter-form-wrap" id="reservar">
            <CharterForm vessel={vessel} />
          </div>
        ) : null}
      </section>

      {/* CTA fijo en móvil: siempre a un toque del cierre. */}
      <div className="sticky-cta">
        {deeplink ? (
          <a className="button button-primary" href="#reservar">
            {t("charter_form_title", locale)}
            {tier ? ` — ${money(tier.price)}` : ""}
          </a>
        ) : (
          <Link className="button button-primary" href={`/cotizar/${vessel.slug}`}>
            {t("quote_cta", locale)}
          </Link>
        )}
      </div>
    </>
  );
}
