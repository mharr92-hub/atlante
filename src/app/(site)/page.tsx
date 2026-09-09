import Hero from "@/components/sections/Hero";
import ValueProps from "@/components/sections/ValueProps";
import ToursSection from "@/components/sections/ToursSection";
import ChartersSection from "@/components/sections/ChartersSection";
import Destinations from "@/components/sections/Destinations";
import About from "@/components/sections/About";
import FaqSection from "@/components/sections/FaqSection";
import ContactSection from "@/components/sections/ContactSection";
import PexDisclosure from "@/components/site/PexDisclosure";
import { site } from "@/config/site";
import { getTicketProducts } from "@/lib/catalog";
import { getOperators, getVessels } from "@/lib/vessels";
import { DEFAULT_PEOPLE, operatorSealVisible } from "@/lib/vessel-pricing";

// Only verifiable facts: no rating, no review count, no email until Mark has a
// real mailbox (PENDIENTE MARK).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TravelAgency",
  name: site.name,
  url: site.url,
  telephone: site.whatsapp.display,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Panama City",
    addressCountry: "PA",
  },
};

export default async function Home() {
  const [tickets, vessels, operators] = await Promise.all([
    getTicketProducts(),
    getVessels(),
    getOperators(),
  ]);
  const byOperator = new Map(operators.map((o) => [o.slug, o]));
  const verified = vessels
    .filter((v) => operatorSealVisible(byOperator.get(v.operatorSlug)))
    .map((v) => v.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <PexDisclosure variant="banner" />
      <ValueProps />
      <ToursSection products={tickets.filter((p) => p.available).slice(0, 3)} />
      <ChartersSection
        vessels={vessels.slice(0, 3)}
        people={DEFAULT_PEOPLE}
        verified={verified}
      />
      <Destinations />
      <About />
      <FaqSection />
      <ContactSection />
    </>
  );
}
