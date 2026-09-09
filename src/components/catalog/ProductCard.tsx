"use client";

import Link from "@/components/site/LocaleLink";
import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { L, t, weekdaysLabel, type DictKey } from "@/lib/i18n";
import { priceFromLabel } from "@/lib/format";
import Badges from "@/components/tour/Badges";

const KIND_KEY: Record<Product["kind"], DictKey> = {
  tour: "kind_tour",
  party: "kind_party",
  ferry: "kind_ferry",
  charter_pex: "kind_charter_pex",
};

/**
 * Tarjeta de ticketería. El precio es el que publica Pacific Experience
 * (`verifiedAt` en el catálogo); el CTA entra al funnel de 3 clics.
 */
export default function ProductCard({ product }: { product: Product }) {
  const { locale } = useLocale();
  const days = weekdaysLabel(product.schedule?.weekdays, locale);

  return (
    <article className="charter-card">
      <Link
        href={`/tours/${product.slug}`}
        className="card-image"
        style={{ backgroundImage: `url(${product.images[0]})` }}
        aria-label={L(product.name, locale)}
      />
      <div className="card-kind">{t(KIND_KEY[product.kind], locale)}</div>
      <h3 style={{ marginTop: 10 }}>{L(product.name, locale)}</h3>
      <p className="card-price">{priceFromLabel(product.priceFrom, product.priceUnit, locale)}</p>
      <p className="fact">
        {L(product.durationLabel, locale)}
        {days ? ` · ${days}` : ""}
      </p>
      <Badges badges={product.badges} />
      <p className="card-body-text">{L(product.summary, locale)}</p>
      <div className="card-actions">
        <Link className="card-link" href={`/tours/${product.slug}`}>
          {t("view_detail", locale)}
        </Link>
        <Link className="button button-primary card-cta" href={`/reservar/${product.slug}`}>
          {t("reserve", locale)}
        </Link>
      </div>
    </article>
  );
}
