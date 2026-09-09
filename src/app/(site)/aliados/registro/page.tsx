import type { Metadata } from "next";
import PartnerForm from "@/components/charters/PartnerForm";

export const metadata: Metadata = {
  title: "Registro de aliados",
  description:
    "Publica tu embarcación en Atlante del Pacífico o súmate como hotel, concierge o agencia. Revisamos cada solicitud antes de publicar la ficha.",
  alternates: { canonical: "/aliados/registro" },
};

export default function AliadosRegistroPage() {
  return (
    <section className="section section-ivory" style={{ paddingTop: 120 }}>
      <div className="section-inner quote-layout">
        <PartnerForm />
      </div>
    </section>
  );
}
