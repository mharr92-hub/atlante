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
import { getTicketProducts, getVessels } from "@/lib/catalog";

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
  const [tickets, vessels] = await Promise.all([getTicketProducts(), getVessels()]);

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
      <ChartersSection vessels={vessels.filter((v) => v.available).slice(0, 3)} />
      <Destinations />
      <About />
      <FaqSection />
      <ContactSection />
    </>
  );
}
