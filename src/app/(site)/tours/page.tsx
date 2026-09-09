import type { Metadata } from "next";
import { getTicketProducts } from "@/lib/catalog";
import { site } from "@/config/site";
import { t } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";
import PexDisclosure from "@/components/site/PexDisclosure";
import TicketsCatalog from "@/components/catalog/TicketsCatalog";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("meta_tours_title", locale),
    description: t("meta_tours_desc", locale),
    alternates: await pageAlternates("/tours"),
  };
}

/** Catálogo de ticketería con el precio publicado por el operador. */
export default async function ToursPage() {
  const available = (await getTicketProducts()).filter((p) => p.available);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tickets y tours",
    numberOfItems: available.length,
    itemListElement: available.map((product, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: product.name.es,
      url: `${site.url}/tours/${product.slug}`,
    })),
  };

  return (
    <div style={{ paddingTop: 90 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PexDisclosure variant="banner" />
      <TicketsCatalog products={available} />
    </div>
  );
}
