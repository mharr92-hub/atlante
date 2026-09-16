"use client";

import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function ComingSoonProducts() {
  const { locale } = useLocale();
  return (
    <section id="travesias" className="section">
      <div className="section-inner three-up">
        <article>
          <p className="fact">{t("hero_product_ferry", locale)}</p>
          <h2>{t("coming_soon", locale)}</h2>
          <p>
            {locale === "es"
              ? "El ferry programado se publica cuando el producto esté listo. No inventamos horarios ni tarifas aquí."
              : "Scheduled ferry publishes when the product is ready. We are not inventing schedules or fares here."}
          </p>
        </article>
        <article>
          <p className="fact">{t("hero_product_tours", locale)}</p>
          <h2>{t("coming_soon", locale)}</h2>
          <p>
            {locale === "es"
              ? "Tours curados llegan después. Hoy el camino vivo es charter privado."
              : "Curated tours come later. The live path today is private charter."}
          </p>
        </article>
        <article>
          <p className="fact">{t("hero_product_charters", locale)}</p>
          <h2>{locale === "es" ? "Disponible" : "Available"}</h2>
          <p>
            {locale === "es"
              ? "Pacific Ferry y Sirena del Mar: ficha, solicitud corta y abono del 30%."
              : "Pacific Ferry and Sirena del Mar: listing, short request and 30% deposit."}
          </p>
        </article>
      </div>
    </section>
  );
}
