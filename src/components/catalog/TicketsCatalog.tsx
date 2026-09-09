"use client";

import { useEffect } from "react";
import type { Product } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import ProductCard from "@/components/catalog/ProductCard";

/** `/tours`: todo el catálogo de ticketería disponible de Pacific Experience. */
export default function TicketsCatalog({ products }: { products: Product[] }) {
  const { locale } = useLocale();

  useEffect(() => {
    track("view_catalog", { portal: "tours" });
  }, []);

  return (
    <section className="section">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("tours_eyebrow", locale)}</p>
          <h1>{t("tours_title", locale)}</h1>
          <p>{t("tours_lede", locale)}</p>
        </div>
        <div className="charter-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
