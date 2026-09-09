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

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <PexDisclosure variant="banner" />
      <ValueProps />
      <ToursSection />
      <ChartersSection />
      <Destinations />
      <About />
      <FaqSection />
      <ContactSection />
    </>
  );
}
