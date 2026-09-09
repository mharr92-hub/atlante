import type { Metadata } from "next";
import { getTicketProducts } from "@/lib/catalog";
import { site } from "@/config/site";
import PexDisclosure from "@/components/site/PexDisclosure";
import TicketsCatalog from "@/components/catalog/TicketsCatalog";

export const metadata: Metadata = {
  title: "Tickets y tours",
  description:
    "Ferry, tours y party en la Bahía de Panamá operados por Pacific Experience, con su precio real. Eliges aquí y pagas en su checkout.",
  alternates: { canonical: "/tours" },
};

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
