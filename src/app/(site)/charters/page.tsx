import type { Metadata } from "next";
import { Suspense } from "react";
import PexDisclosure from "@/components/site/PexDisclosure";
import ChartersCatalog from "@/components/charters/ChartersCatalog";
import { site } from "@/config/site";
import { getOperators, getVessels } from "@/lib/vessels";
import { operatorSealVisible } from "@/lib/vessel-pricing";
import { t } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("meta_charters_title", locale),
    description: t("meta_charters_desc", locale),
    alternates: await pageAlternates("/charters"),
  };
}

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
