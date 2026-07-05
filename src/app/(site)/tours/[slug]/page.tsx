import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getTour, tours } from "@/content/tours";
import { site } from "@/config/site";
import { L, type Locale } from "@/lib/i18n";
import TourDetail from "@/components/tour/TourDetail";

export function generateStaticParams() {
  return tours.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = getTour(slug);
  if (!tour) return {};
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("locale")?.value === "en" ? "en" : "es";
  const title = L(tour.name, locale);
  const description = L(tour.summary, locale);
  const url = `${site.url}/tours/${tour.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: tour.heroImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tour = getTour(slug);
  if (!tour) notFound();

  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("locale")?.value === "en" ? "en" : "es";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: L(tour.name, locale),
    description: L(tour.description, locale),
    touristType: tour.badges,
    offers: {
      "@type": "Offer",
      price: tour.pricing.priceFrom,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    provider: { "@type": "TravelAgency", name: site.name, url: site.url },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TourDetail tour={tour} />
    </>
  );
}
