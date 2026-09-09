import type { Metadata } from "next";
import { Suspense } from "react";
import PexDisclosure from "@/components/site/PexDisclosure";
import ChartersCatalog from "@/components/charters/ChartersCatalog";
import { site } from "@/config/site";
import { getOperators, getVessels } from "@/lib/vessels";
import { operatorSealVisible } from "@/lib/vessel-pricing";

export const metadata: Metadata = {
  title: "Charters — compara naves por capacidad y precio por persona",
  description:
    "Marketplace de charters en Ciudad de Panamá: capacidad, rutas, jornadas de 4, 8 y 12 horas y precio por persona calculado para tu grupo. El pago se completa con el operador.",
  alternates: { canonical: "/charters" },
};

export default async function ChartersPage() {
  const [vessels, operators] = await Promise.all([getVessels(), getOperators()]);
  const byOperator = new Map(operators.map((o) => [o.slug, o]));
  const verified = vessels
    .filter((v) => operatorSealVisible(byOperator.get(v.operatorSlug)))
    .map((v) => v.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: vessels.map((vessel, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: vessel.name,
      url: `${site.url}/charters/${vessel.slug}`,
    })),
  };

  return (
    <div style={{ paddingTop: 90 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PexDisclosure variant="banner" />
      <Suspense fallback={<div className="section section-ivory" />}>
        <ChartersCatalog vessels={vessels} verified={verified} />
      </Suspense>
    </div>
  );
}
