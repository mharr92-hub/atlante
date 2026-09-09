"use client";

import Link from "@/components/site/LocaleLink";
import { destinations } from "@/content/destinations";
import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";

/**
 * Home → destinos (bloque 6.1).
 *
 * Antes esta sección tenía tres textos con cifras que nadie podía respaldar
 * (millas náuticas y horas de navegación). Ahora lee `content/destinations.ts`,
 * que no tiene ningún número, y cada destino enlaza a su página con todas las
 * formas de ir.
 */
export default function Destinations() {
  const { locale } = useLocale();
  return (
    <section id="destinos" className="section section-ivory">
      <div className="section-inner split">
        <div>
          <p className="eyebrow">{t("destinos_eyebrow", locale)}</p>
          <h2>{t("destinos_title", locale)}</h2>
          <p>{t("destinos_lede", locale)}</p>
        </div>
        <div className="destination-list">
          {destinations.map((d) => (
            <article key={d.slug}>
              <h3>
                <Link href={`/destinos/${d.slug}`}>{L(d.name, locale)}</Link>
              </h3>
              <p>{L(d.summary, locale)}</p>
              <Link className="card-link" href={`/destinos/${d.slug}`}>
                {t("dest_see", locale)}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
