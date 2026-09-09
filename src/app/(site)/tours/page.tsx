import type { Metadata } from "next";
import ToursSection from "@/components/sections/ToursSection";
import PexDisclosure from "@/components/site/PexDisclosure";

export const metadata: Metadata = {
  title: "Tickets y tours",
  description:
    "Ferry, tours y experiencias en el Pacifico panameno de operadores verificados. Comparas aqui y pagas directo con el operador.",
  alternates: { canonical: "/tours" },
};

/**
 * Placeholder catalog page: it renders the home section so the header, hero and
 * footer links do not 404. Block 2 replaces it with the real PEX catalog.
 */
export default function ToursPage() {
  return (
    <div style={{ paddingTop: 90 }}>
      <PexDisclosure variant="banner" />
      <ToursSection />
    </div>
  );
}
