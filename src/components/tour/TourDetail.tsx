"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { Tour } from "@/content/tours";
import { site } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";
import Badges from "@/components/tour/Badges";
import WeatherWidget from "@/components/tour/WeatherWidget";
import PriceCalculator from "@/components/tour/PriceCalculator";

// Leaflet touches window, so load the map client-side only.
const RouteMap = dynamic(() => import("@/components/tour/RouteMap"), {
  ssr: false,
  loading: () => <div className="route-map" style={{ background: "rgba(10,36,33,.06)" }} />,
});

export default function TourDetail({ tour }: { tour: Tour }) {
  const { locale } = useLocale();

  return (
    <>
      <section className={`tour-hero`}>
        <div className="hero-media" style={{ backgroundImage: `linear-gradient(rgba(10,36,33,.35),rgba(10,36,33,.7)), url(${tour.heroImage})` }} />
        <div className="hero-overlay" />
        <div className="section-inner">
          <Link href="/#travesias" className="back-link">
            ← {t("back_home", locale)}
          </Link>
          <p className="eyebrow" style={{ color: "var(--gold)" }}>
            {tour.kind === "charter" ? t("charters_eyebrow", locale) : t("tours_eyebrow", locale)}
          </p>
          <h1 style={{ fontSize: "clamp(40px,7vw,84px)" }}>{L(tour.name, locale)}</h1>
          <p className="lede">{L(tour.tagline, locale)}</p>
        </div>
      </section>

      <section className="section section-ivory">
        <div className="section-inner tour-layout">
          <div>
            <div className="tour-block">
              <Badges badges={tour.badges} />
              <p style={{ fontSize: 19, marginTop: 16 }}>{L(tour.description, locale)}</p>
            </div>

            <div className="tour-block">
              <h2>{t("weather", locale)}</h2>
              <WeatherWidget lat={site.geo.lat} lng={site.geo.lng} />
            </div>

            <div className="tour-block">
              <h2>{t("itinerary", locale)}</h2>
              <div className="itinerary-list">
                {tour.itinerary.map((s, i) => (
                  <div className="itinerary-item" key={i}>
                    <div className="time">{L(s.time, locale)}</div>
                    <div>
                      <strong>{L(s.title, locale)}</strong>
                      <p style={{ margin: "4px 0 0", color: "rgba(10,36,33,.7)" }}>{L(s.detail, locale)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tour-block">
              <h2>{t("route_map", locale)}</h2>
              <RouteMap tour={tour} />
            </div>

            <div className="tour-block" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div>
                <h2 style={{ fontSize: 26 }}>{t("included", locale)}</h2>
                <ul className="list-check">
                  {tour.included.map((it, i) => (
                    <li key={i}>{L(it, locale)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 style={{ fontSize: 26 }}>{t("excluded", locale)}</h2>
                <ul className="list-cross">
                  {tour.excluded.map((it, i) => (
                    <li key={i}>{L(it, locale)}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="tour-block">
              <h2>{locale === "es" ? "Galeria" : "Gallery"}</h2>
              <div className="gallery-grid">
                {tour.gallery.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`${L(tour.name, locale)} ${i + 1}`} loading="lazy" />
                ))}
              </div>
            </div>

            <div className="tour-block">
              <h2>{t("faq_eyebrow", locale)}</h2>
              <div className="faq-list">
                {tour.faqs.map((f, i) => (
                  <details key={i}>
                    <summary>{L(f.q, locale)}</summary>
                    <p>{L(f.a, locale)}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          <PriceCalculator tour={tour} />
        </div>
      </section>
    </>
  );
}
