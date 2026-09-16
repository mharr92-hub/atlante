import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLiveCharter } from "@/data/charters";
import { L } from "@/lib/i18n";
import CharterReserveForm from "@/components/charter/CharterReserveForm";

export const metadata: Metadata = {
  title: "Solicitar charter",
  description: "Envía tu solicitud de charter con nombre, WhatsApp, fecha, horas y personas.",
};

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ hours?: string }>;
}) {
  const { slug } = await params;
  const { hours } = await searchParams;
  const charter = getLiveCharter(slug);
  if (!charter) notFound();

  return (
    <section className="section section-ivory" style={{ paddingTop: 140 }}>
      <div className="section-inner reserve-layout">
        <div>
          <p className="eyebrow">Atlante</p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)" }}>
            Reservar {L(charter.name, "es")}
          </h1>
          <p>
            Completa el formulario. El abono del 30% confirma la solicitud, no la reserva.
            Te escribimos por WhatsApp en un máximo de 24 horas.
          </p>
        </div>
        <CharterReserveForm charter={charter} initialDurationId={hours} />
      </div>
    </section>
  );
}
