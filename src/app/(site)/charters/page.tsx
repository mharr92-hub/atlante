import type { Metadata } from "next";
import PexDisclosure from "@/components/site/PexDisclosure";
import VesselsCatalog from "@/components/catalog/VesselsCatalog";
import { getVessels } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Charters",
  description:
    "Naves de Pacific Experience para grupos: Aura, Pacific Ferry 1 y Sirena del Mar, con salida desde Marina Flamenco. La reserva se completa en su checkout.",
  alternates: { canonical: "/charters" },
};

export default async function ChartersPage() {
  const vessels = (await getVessels()).filter((v) => v.available);

  return (
    <div style={{ paddingTop: 90 }}>
      <PexDisclosure variant="banner" />
      <VesselsCatalog vessels={vessels} />
    </div>
  );
}
