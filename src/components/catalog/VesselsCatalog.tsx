"use client";

import { useEffect } from "react";
import { pexVessels } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import VesselCard from "@/components/catalog/VesselCard";

/**
 * `/charters`: las naves de Pacific Experience.
 * El marketplace completo (naves aliadas, filtros y comparador) llega en el
 * bloque 4; aquí el cierre es el checkout de PEX con `ref=ATLANTE`.
 */
export default function VesselsCatalog() {
  const { locale } = useLocale();
  const vessels = pexVessels.filter((v) => v.available);

  useEffect(() => {
    track("view_catalog", { portal: "charters" });
  }, []);

  return (
    <section className="section section-ivory">
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">{t("charters_eyebrow", locale)}</p>
          <h1>{t("charters_title", locale)}</h1>
          <p>{t("charters_lede", locale)}</p>
        </div>
        <div className="charter-grid">
          {vessels.map((vessel) => (
            <VesselCard key={vessel.slug} vessel={vessel} />
          ))}
        </div>
      </div>
    </section>
  );
}
