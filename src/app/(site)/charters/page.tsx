import type { Metadata } from "next";
import ChartersSection from "@/components/sections/ChartersSection";
import PexDisclosure from "@/components/site/PexDisclosure";

export const metadata: Metadata = {
  title: "Charters",
  description:
    "Renta total de embarcacion desde Ciudad de Panama hacia Taboga, la Bahia y Las Perlas. Cotizas con Atlante y pagas directo con el operador.",
  alternates: { canonical: "/charters" },
};

/**
 * Placeholder charters page: it renders the home section so the hero and footer
 * links do not 404. Block 2 replaces it with the vessel marketplace.
 */
export default function ChartersPage() {
  return (
    <div style={{ paddingTop: 90 }}>
      <PexDisclosure variant="banner" />
      <ChartersSection />
    </div>
  );
}
