import type { Metadata } from "next";
import PartnersPitch from "@/components/charters/PartnersPitch";

export const metadata: Metadata = {
  title: "Aliados — operadores, hoteles y agencias",
  description:
    "Publica tu embarcación en el marketplace de Atlante, recomienda con código de aliado o arma paquetes con tarifa neta. Atlante no opera naves ni cobra al cliente.",
  alternates: { canonical: "/aliados" },
};

export default function AliadosPage() {
  return (
    <div style={{ paddingTop: 90 }}>
      <PartnersPitch />
    </div>
  );
}
