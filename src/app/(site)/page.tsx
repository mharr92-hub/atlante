import Hero from "@/components/sections/Hero";
import ValueProps from "@/components/sections/ValueProps";
import ComingSoonProducts from "@/components/sections/ComingSoonProducts";
import ChartersSection from "@/components/sections/ChartersSection";
import Destinations from "@/components/sections/Destinations";
import About from "@/components/sections/About";
import ReviewsSection from "@/components/sections/ReviewsSection";
import FaqSection from "@/components/sections/FaqSection";
import ContactSection from "@/components/sections/ContactSection";
import { site } from "@/config/site";
import { aggregateRating } from "@/content/reviews";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: site.name,
  description: site.description,
  url: site.url,
  email: site.email,
  telephone: site.whatsapp.display,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Panama City",
    addressCountry: "PA",
  },
  geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: aggregateRating.value,
    reviewCount: aggregateRating.count,
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <ValueProps />
      <ChartersSection />
      <ComingSoonProducts />
      <Destinations />
      <About />
      <ReviewsSection />
      <FaqSection />
      <ContactSection />
    </>
  );
}
