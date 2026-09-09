import type { Metadata } from "next";
import PexDisclosure from "@/components/site/PexDisclosure";
import VesselsCatalog from "@/components/catalog/VesselsCatalog";

export const metadata: Metadata = {
  title: "Charters",
  description:
    "Naves de Pacific Experience para grupos: Aura, Pacific Ferry 1 y Sirena del Mar, con salida desde Marina Flamenco. La reserva se completa en su checkout.",
  alternates: { canonical: "/charters" },
};

export default function ChartersPage() {
  return (
    <div style={{ paddingTop: 90 }}>
      <PexDisclosure variant="banner" />
      <VesselsCatalog />
    </div>
  );
}
