"use client";

import Link from "next/link";
import type { Charter } from "@/data/charters";
import { DEPOSIT_PERCENT, depositFromSample } from "@/data/charters";
import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";
import { money } from "@/lib/format";
import { useCurrency } from "@/lib/currency-context";
import { site } from "@/config/site";
import DepositDisclaimer from "@/components/charter/DepositDisclaimer";
import CharterReserveForm from "@/components/charter/CharterReserveForm";

export default function CharterFicha({
  charter,
  initialDurationId,
}: {
  charter: Charter;
  initialDurationId?: string;
}) {
  const { locale } = useLocale();
  const { currency } = useCurrency();
  const from = charter.citedRangeUsd?.from;

  return (
    <>
      <section className="tour-hero">
        <div
          className="hero-media"
          style={{
            backgroundImage: `linear-gradient(rgba(10,36,33,.35),rgba(10,36,33,.7)), url(${charter.heroImage})`,
          }}
        />
        <div className="hero-overlay" />
        <div className="section-inner">
          <Link href="/charters" className="back-link">
            ← {locale === "es" ? "Flota" : "Fleet"}
          </Link>
          <p className="eyebrow" style={{ color: "var(--gold)" }}>
            {locale === "es" ? "Chárter privado" : "Private charter"}
          </p>
          <h1 style={{ fontSize: "clamp(40px,7vw,84px)" }}>{L(charter.name, locale)}</h1>
          <p className="lede">{L(charter.tagline, locale)}</p>
        </div>
      </section>

      <section className="section section-ivory">
        <div className="section-inner tour-layout">
          <div>
            <div className="tour-block">
              <p style={{ fontSize: 19, marginTop: 0 }}>{L(charter.description, locale)}</p>
            </div>

            <div className="tour-block">
              <h2>{locale === "es" ? "Ficha" : "Specs"}</h2>
              <dl className="spec-grid">
                {charter.specs.map((s) => (
                  <div key={L(s.label, "en")}>
                    <dt>{L(s.label, locale)}</dt>
                    <dd>{L(s.value, locale)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="tour-block">
              <h2>{locale === "es" ? "Galería" : "Gallery"}</h2>
              <div className="gallery-grid">
                {charter.gallery.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${src}-${i}`} src={src} alt={`${L(charter.name, locale)} ${i + 1}`} loading="lazy" />
                ))}
              </div>
            </div>

            <div className="tour-block">
              <h2>{locale === "es" ? "Precio por duración" : "Price by duration"}</h2>
              <p className="muted-copy">
                {locale === "es"
                  ? "Montos de referencia (por confirmar). No hay calendario en vivo: el abono es una solicitud, no una reserva."
                  : "Reference amounts (to confirm). No live calendar: the deposit is a request, not a reservation."}
              </p>
              {charter.citedRangeUsd ? (
                <p className="muted-copy">
                  {locale === "es" ? "Rango citado" : "Cited range"}: {money(charter.citedRangeUsd.from, currency)} –{" "}
                  {money(charter.citedRangeUsd.to, currency)}
                </p>
              ) : null}
              <table className="price-table">
                <thead>
                  <tr>
                    <th>{locale === "es" ? "Duración" : "Duration"}</th>
                    <th>{locale === "es" ? "Total muestra" : "Sample total"}</th>
                    <th>{locale === "es" ? `Abono ${DEPOSIT_PERCENT}%` : `${DEPOSIT_PERCENT}% deposit`}</th>
                  </tr>
                </thead>
                <tbody>
                  {charter.durations.map((d) => {
                    const deposit = d.sampleTotalUsd != null ? depositFromSample(d.sampleTotalUsd) : null;
                    return (
                      <tr key={d.id}>
                        <td>{L(d.label, locale)}</td>
                        <td>
                          {d.sampleTotalUsd != null ? (
                            <>
                              {money(d.sampleTotalUsd, currency)}{" "}
                              <small>
                                {locale === "es" ? "referencia" : "reference"}
                              </small>
                            </>
                          ) : (
                            <small>
                              {locale === "es" ? "por confirmar" : "to confirm"}
                            </small>
                          )}
                        </td>
                        <td>{deposit != null ? money(deposit, currency) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="tour-block">
              <h2>{locale === "es" ? "Incluye" : "Includes"}</h2>
              <ul className="list-check">
                {charter.includes.map((it, i) => (
                  <li key={i}>{L(it, locale)}</li>
                ))}
              </ul>
              <p className="muted-copy">
                {locale === "es"
                  ? "El operador de la nave confirma el inventario exacto al validar tu fecha."
                  : "The vessel operator confirms exact inventory when validating your date."}
              </p>
            </div>

            <div className="tour-block">
              <h2>{locale === "es" ? "Política de abono" : "Deposit policy"}</h2>
              <DepositDisclaimer />
              <p className="muted-copy">
                {locale === "es" ? "Concierge WhatsApp:" : "Concierge WhatsApp:"} {site.whatsapp.display}
              </p>
            </div>
          </div>

          <CharterReserveForm charter={charter} initialDurationId={initialDurationId} />
        </div>
      </section>

      {from != null ? (
        <p className="sr-only">
          {locale === "es" ? "Desde" : "From"} {money(from, currency)}
        </p>
      ) : null}
    </>
  );
}
