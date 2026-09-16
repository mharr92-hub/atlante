import type { Metadata } from "next";
import { liveCharters, upcomingCharters } from "@/data/charters";
import { site } from "@/config/site";
import CharterCard from "@/components/charter/CharterCard";
import DepositDisclaimer from "@/components/charter/DepositDisclaimer";

export const metadata: Metadata = {
  title: "Charters privados",
  description:
    "Alquila el barco completo en el Pacífico panameño. Pacific Ferry y Sirena del Mar con solicitud en línea y abono del 30%.",
  alternates: { canonical: `${site.url}/charters` },
};

export default function ChartersPage() {
  return (
    <section className="section section-ivory charter-index" style={{ paddingTop: 140 }}>
      <div className="section-inner">
        <div className="section-heading">
          <p className="eyebrow">Atlante</p>
          <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)" }}>Charters privados</h1>
          <p>
            Elige la nave, mira la ficha y envía una solicitud con abono del 30%. Confirmamos
            disponibilidad con el operador en un máximo de 24 horas por WhatsApp.
          </p>
        </div>
        <DepositDisclaimer className="deposit-disclaimer-lead" />

        <h2 className="fleet-subhead">Disponibles para solicitar</h2>
        <div className="charter-grid">
          {liveCharters.map((c) => (
            <CharterCard key={c.slug} charter={c} />
          ))}
        </div>

        <h2 className="fleet-subhead">Próximamente</h2>
        <p className="muted-copy" style={{ marginTop: -12, marginBottom: 24 }}>
          Nombres de flota sin tarifas ni specs inventados. Se publican cuando Mark cargue datos.
        </p>
        <div className="charter-grid charter-grid-soon">
          {upcomingCharters.map((c) => (
            <CharterCard key={c.slug} charter={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
