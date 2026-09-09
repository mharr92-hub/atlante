import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { destinations, getDestination } from "@/content/destinations";
import { getTicketProducts } from "@/lib/catalog";
import { getOperators, getVessels } from "@/lib/vessels";
import { productsForDestination, vesselsForDestination } from "@/lib/destinations";
import { DEFAULT_PEOPLE, operatorSealVisible } from "@/lib/vessel-pricing";
import { site } from "@/config/site";
import { L } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";
import PexDisclosure from "@/components/site/PexDisclosure";
import DestinationDetail from "@/components/destinations/DestinationDetail";

export function generateStaticParams() {
  return destinations.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) return {};
  const locale = await getLocale();

  return {
    title: L(destination.title, locale),
    description: L(destination.summary, locale),
    alternates: await pageAlternates(`/destinos/${destination.slug}`),
  };
}

/**
 * `/destinos/[slug]` — "todas las formas de ir" (bloque 6.1).
 *
 * El cruce lo hace `lib/destinations.ts` sobre el catálogo y el marketplace, así
 * que la página no conoce ningún precio: muestra los que ya están verificados.
 *
 * JSON-LD `TouristDestination` **sin rating** (regla 3 y PRD 5.11): Atlante no
 * tiene reseñas propias y no se inventa ninguna.
 */
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) notFound();

  const [locale, tickets, vessels, operators] = await Promise.all([
    getLocale(),
    getTicketProducts(),
    getVessels(),
    getOperators(),
  ]);

  const { available, unavailable } = productsForDestination(destination, tickets);
  const mine = vesselsForDestination(destination, vessels);
  const byOperator = new Map(operators.map((o) => [o.slug, o]));
  const verified = mine
    .filter((v) => operatorSealVisible(byOperator.get(v.operatorSlug)))
    .map((v) => v.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: L(destination.name, locale),
    description: L(destination.summary, locale),
    url: `${site.url}/destinos/${destination.slug}`,
    address: { "@type": "PostalAddress", addressCountry: "PA" },
  };

  return (
    <div style={{ paddingTop: 90 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PexDisclosure variant="banner" />
      <DestinationDetail
        destination={destination}
        products={available}
        unavailable={unavailable}
        vessels={mine}
        people={DEFAULT_PEOPLE}
        verified={verified}
      />
    </div>
  );
}
