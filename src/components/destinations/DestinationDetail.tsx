"use client";

import { useEffect } from "react";
import type { Product } from "@/content/catalog";
import type { Destination } from "@/content/destinations";
import type { Vessel } from "@/content/vessels";
import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import ProductCard from "@/components/catalog/ProductCard";
import VesselCard from "@/components/charters/VesselCard";

/**
 * Página de destino (bloque 6.1): el texto del lugar y, debajo, **todas las
 * formas de ir** que el catálogo puede reservar hoy.
 *
 * Cada tarjeta es la misma que usan `/tours` y `/charters`, así que el precio y
 * el CTA salen de la misma fuente verificada; esta pantalla no calcula ni
 * inventa ninguno. Los productos que el operador no está vendiendo se nombran
 * sin precio y sin botón: existen, pero no se pueden reservar.
 */
export default function DestinationDetail({
  destination,
  products,
  unavailable,
  vessels,
  people,
  verified = [],
}: {
  destination: Destination;
  /** Ticketería disponible que llega al destino. */
  products: Product[];
  /** Ticketería del destino que el operador no está vendiendo. */
  unavailable: Product[];
  /** Naves cuya ruta incluye el destino. */
  vessels: Vessel[];
  /** Grupo con el que se calcula el "desde $X por persona". */
  people: number;
  verified?: string[];
}) {
  const { locale } = useLocale();
  const sealed = new Set(verified);
  const nothing =
    products.length === 0 && unavailable.length === 0 && vessels.length === 0;

  useEffect(() => {
    track("view_catalog", { portal: `destino:${destination.slug}` });
  }, [destination.slug]);

  return (
    <>
      <section className="section">
        <div className="section-inner">
          <div className="section-heading">
            <p className="eyebrow">{t("destinos_eyebrow", locale)}</p>
            <h1>{L(destination.title, locale)}</h1>
            <p>{L(destination.summary, locale)}</p>
          </div>
          <div className="destination-copy">
            {destination.paragraphs.map((p) => (
              <p key={p.en}>{L(p, locale)}</p>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 ? (
        <section className="section section-ivory">
          <div className="section-inner">
            <div className="section-heading">
              <h2>{t("dest_tickets_title", locale)}</h2>
            </div>
            <div className="charter-grid">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {vessels.length > 0 ? (
        <section className="section">
          <div className="section-inner">
            <div className="section-heading">
              <h2>{t("dest_charters_title", locale)}</h2>
            </div>
            <div className="charter-grid">
              {vessels.map((vessel) => (
                <VesselCard
                  key={vessel.slug}
                  vessel={vessel}
                  people={people}
                  verified={sealed.has(vessel.slug)}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {unavailable.length > 0 ? (
        <section className="section section-ivory">
          <div className="section-inner">
            <div className="section-heading">
              <h2>{t("dest_unavailable_title", locale)}</h2>
              <p>{t("dest_unavailable_note", locale)}</p>
            </div>
            <ul className="destination-pending">
              {unavailable.map((product) => (
                <li key={product.slug}>{L(product.name, locale)}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {nothing ? (
        <section className="section section-ivory">
          <div className="section-inner">
            <p>{t("dest_empty", locale)}</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
