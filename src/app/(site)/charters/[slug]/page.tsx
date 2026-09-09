import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VesselDetail from "@/components/charters/VesselDetail";
import { site } from "@/config/site";
import { L, tf } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";
import { PEX_BRAND } from "@/lib/pex";
import { getOperator, getVessel, getVessels } from "@/lib/vessels";
import { cheapestRow, operatorSealVisible } from "@/lib/vessel-pricing";

export async function generateStaticParams() {
  return (await getVessels()).map((vessel) => ({ slug: vessel.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vessel = await getVessel(slug);
  if (!vessel) return {};
  const locale = await getLocale();

  return {
    title: tf("meta_vessel_title", locale, { name: vessel.name }),
    ...(vessel.summary ? { description: L(vessel.summary, locale) } : {}),
    alternates: await pageAlternates(`/charters/${vessel.slug}`),
  };
}

export default async function VesselPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vessel = await getVessel(slug);
  if (!vessel || !vessel.active) notFound();

  const operator = (await getOperator(vessel.operatorSlug)) ?? null;
  const tier = cheapestRow(vessel);

  // `Product` con `Offer` sólo cuando hay un precio publicado (PRD 5.11).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: vessel.name,
    ...(vessel.summary ? { description: vessel.summary.es } : {}),
    url: `${site.url}/charters/${vessel.slug}`,
    ...(operator ? { brand: { "@type": "Brand", name: operator.name } } : {}),
    ...(tier
      ? {
          offers: {
            "@type": "Offer",
            price: tier.price,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            ...(vessel.closeMode === "deeplink"
              ? { seller: { "@type": "Organization", name: PEX_BRAND } }
              : {}),
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VesselDetail
        vessel={vessel}
        operator={operator}
        verified={operatorSealVisible(operator)}
      />
    </>
  );
}
