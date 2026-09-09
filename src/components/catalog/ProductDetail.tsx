"use client";

import Link from "@/components/site/LocaleLink";
import { useEffect } from "react";
import type { Product } from "@/content/catalog";
import { site } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import {
  L,
  t,
  tf,
  formatDate,
  weekdaysLabel,
  WEEKDAYS_LONG,
  type Locale,
} from "@/lib/i18n";
import { money, priceFromLabel } from "@/lib/format";
import { slotLabel } from "@/lib/funnel";
import { track } from "@/lib/analytics";
import Badges from "@/components/tour/Badges";
import WeatherWidget from "@/components/tour/WeatherWidget";
import PexDisclosure from "@/components/site/PexDisclosure";

function scheduleLine(product: Product, locale: Locale): string | null {
  const s = product.schedule;
  if (!s) return null;
  if (s.note) return L(s.note, locale);
  const days =
    s.weekdays.length === 7
      ? locale === "es"
        ? "todos los días"
        : "every day"
      : s.weekdays.map((d) => WEEKDAYS_LONG[locale][d]).join(", ");
  const times = s.times.map(slotLabel).join(" · ");
  return times ? `${days} · ${times}` : days;
}

export default function ProductDetail({ product }: { product: Product }) {
  const { locale } = useLocale();

  useEffect(() => {
    track("view_product", { slug: product.slug, kind: product.kind });
  }, [product.slug, product.kind]);

  const schedule = scheduleLine(product, locale);
  const days = weekdaysLabel(product.schedule?.weekdays, locale);

  return (
    <>
      <section className="tour-hero">
        <div
          className="hero-media"
          style={{
            backgroundImage: `linear-gradient(rgba(10,36,33,.35),rgba(10,36,33,.7)), url(${product.images[0]})`,
          }}
        />
        <div className="hero-overlay" />
        <div className="section-inner">
          <Link href="/tours" className="back-link">
            ← {t("back_catalog", locale)}
          </Link>
          <p className="eyebrow" style={{ color: "var(--gold)" }}>
            {t("tours_eyebrow", locale)}
          </p>
          <h1 style={{ fontSize: "clamp(34px,7vw,72px)" }}>{L(product.name, locale)}</h1>
          <p className="lede">{L(product.summary, locale)}</p>
        </div>
      </section>

      <section className="section section-ivory">
        <div className="section-inner tour-layout">
          <div>
            <div className="tour-block">
              <Badges badges={product.badges} />
              <p style={{ fontSize: 17, marginTop: 16 }}>{L(product.description, locale)}</p>
            </div>

            <div className="tour-block">
              <h2>{t("prices", locale)}</h2>
              <table className="price-table">
                <tbody>
                  {(product.priceTable ?? []).map((row) => (
                    <tr key={row.key}>
                      <th scope="row">
                        {L(row.label, locale)}
                        {row.note ? <span className="price-note">{L(row.note, locale)}</span> : null}
                      </th>
                      <td>{money(row.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {product.notIncluded?.length ? (
                <>
                  <h3 className="sub-h3">{t("excluded", locale)}</h3>
                  <ul className="list-cross">
                    {product.notIncluded.map((it, i) => (
                      <li key={i}>{L(it, locale)}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            {schedule ? (
              <div className="tour-block">
                <h2>{t("schedule", locale)}</h2>
                <p>{schedule}</p>
                {product.schedule?.validFrom ? (
                  <p className="fact">
                    {locale === "es" ? "Desde el " : "From "}
                    {formatDate(product.schedule.validFrom, locale)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="tour-block">
              <h2>{t("included", locale)}</h2>
              <ul className="list-check">
                {product.includes.map((it, i) => (
                  <li key={i}>{L(it, locale)}</li>
                ))}
              </ul>
            </div>

            <div className="tour-block">
              <h2>{t("policies", locale)}</h2>
              <ul className="list-check">
                {product.policies.map((it, i) => (
                  <li key={i}>{L(it, locale)}</li>
                ))}
              </ul>
            </div>

            <div className="tour-block">
              <h2>{t("weather", locale)}</h2>
              <WeatherWidget lat={site.geo.lat} lng={site.geo.lng} />
            </div>

            <div className="tour-block">
              <h2>{t("gallery", locale)}</h2>
              <div className="gallery-grid">
                {product.images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`${L(product.name, locale)} ${i + 1}`} loading="lazy" />
                ))}
              </div>
              <p className="fact">
                {t("verified_on", locale)} {formatDate(product.verifiedAt, locale)}
              </p>
            </div>
          </div>

          <aside className="book-panel">
            <div className="price-big">{money(product.priceFrom)}</div>
            <div className="price-sub">
              {priceFromLabel(product.priceFrom, product.priceUnit, locale)}
            </div>
            <p className="fact" style={{ marginTop: 12 }}>
              {L(product.durationLabel, locale)}
              {days ? ` · ${days}` : ""}
            </p>
            {product.capacityMin ? (
              <p className="fact">{tf("min_group", locale, { n: product.capacityMin })}</p>
            ) : null}
            <Link
              className="button button-primary"
              style={{ width: "100%", marginTop: 16 }}
              href={`/reservar/${product.slug}`}
            >
              {t("reserve", locale)}
            </Link>
            <p className="fact" style={{ marginTop: 12 }}>
              {t("availability_note", locale)}
            </p>
            <div style={{ marginTop: 18, borderTop: "1px solid rgba(10,36,33,.14)", paddingTop: 16 }}>
              <PexDisclosure variant="inline" tone="light" />
            </div>
          </aside>
        </div>
      </section>

      {/* CTA fijo en móvil: siempre a un toque del funnel. */}
      <div className="sticky-cta">
        <Link className="button button-primary" href={`/reservar/${product.slug}`}>
          {t("reserve_from", locale)} {money(product.priceFrom)}
        </Link>
      </div>
    </>
  );
}
