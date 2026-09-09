"use client";

import Link from "next/link";
import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import ProductCard from "@/components/catalog/ProductCard";

/**
 * Home: los tres primeros tickets disponibles del catálogo.
 * Los productos llegan por prop desde la página (servidor), que los pide a
 * `lib/catalog.ts`: base de datos si la hay, catálogo en código si no.
 */
export default function ToursSection({ products }: { products: Product[] }) {
  const { locale } = useLocale();

  return (
    <section id="travesias" className="section">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("tours_eyebrow", locale)}</p>
          <h2>{t("tours_title", locale)}</h2>
          <p>{t("tours_lede", locale)}</p>
        </div>

        <div className="charter-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>

        <div className="section-more">
          <Link className="button button-ghost" href="/tours">
            {t("view_all_tours", locale)}
          </Link>
        </div>
      </div>
    </section>
  );
}
