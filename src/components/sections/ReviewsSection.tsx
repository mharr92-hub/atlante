"use client";

import { reviews } from "@/content/reviews";
import { site } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { L } from "@/lib/i18n";

export default function ReviewsSection() {
  const { locale } = useLocale();
  return (
    <section className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{locale === "es" ? "Lo que dicen" : "What they say"}</p>
          <h2>
            {site.trust.googleRating} ★ · {site.trust.reviewCount}{" "}
            {locale === "es" ? "resenas verificadas" : "verified reviews"}
          </h2>
          <p>
            {locale === "es"
              ? "Recopiladas automaticamente despues de cada viaje."
              : "Collected automatically after every trip."}
          </p>
        </div>
        <div className="review-grid">
          {reviews.map((r) => (
            <article className="review-card" key={r.name}>
              <div className="stars" aria-label={`${r.stars} stars`}>
                {"★".repeat(r.stars)}
              </div>
              <p>&ldquo;{L(r.text, locale)}&rdquo;</p>
              <p className="who">{r.name}</p>
              <p className="meta">
                {L(r.trip, locale)} · {r.source}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
