import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getTicketProducts } from "@/lib/catalog";
import { site } from "@/config/site";
import { L } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";
import { PEX_BRAND } from "@/lib/pex";
import ProductDetail from "@/components/catalog/ProductDetail";

export async function generateStaticParams() {
  const products = await getTicketProducts();
  return products.filter((p) => p.available).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || !product.available) return {};
  const locale = await getLocale();
  const title = L(product.name, locale);
  const description = L(product.summary, locale);
  const alternates = await pageAlternates(`/tours/${product.slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      images: [{ url: product.images[0], width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  // Un producto que PEX no está vendiendo no tiene ficha pública.
  if (!product || !product.available || product.kind === "charter_pex") notFound();

  const locale = await getLocale();

  // El precio es el publicado por el operador y verificado el `verifiedAt`
  // del catálogo, así que el Offer ya puede emitirse (PRD 5.11).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: L(product.name, locale),
    description: L(product.description, locale),
    touristType: product.badges ?? [],
    provider: { "@type": "Organization", name: PEX_BRAND },
    offers: {
      "@type": "Offer",
      price: product.priceFrom,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${site.url}/reservar/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} />
    </>
  );
}
