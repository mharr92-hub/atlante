import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLiveCharter, DEPOSIT_DISCLAIMER_ES } from "@/data/charters";
import { site, whatsappUrl } from "@/config/site";
import { L } from "@/lib/i18n";
import { getCharterLeadByToken } from "@/lib/charter-requests";
import DepositDisclaimer from "@/components/charter/DepositDisclaimer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Solicitud recibida",
  description: "Gracias por tu solicitud de charter. Confirmamos disponibilidad en un máximo de 24 horas.",
};

export default async function GraciasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; pago?: string }>;
}) {
  const { slug } = await params;
  const { token, pago } = await searchParams;
  const charter = getLiveCharter(slug);
  if (!charter) notFound();

  const lead = token ? await getCharterLeadByToken(token) : null;
  const paid = lead?.paymentStatus === "paid";
  const pendingPay = pago === "pendiente" || (!paid && pago !== "fallido");
  const failed = pago === "fallido" && !paid;

  const wa = whatsappUrl(
    `Hola Atlante, envié una solicitud para ${L(charter.name, "es")}${lead?.bookingDate ? ` el ${lead.bookingDate.toISOString().slice(0, 10)}` : ""}.`,
  );

  return (
    <section className="section section-ivory" style={{ paddingTop: 140 }}>
      <div className="section-inner gracias-panel">
        <p className="eyebrow">Atlante</p>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)" }}>
          {paid
            ? "Abono recibido"
            : failed
              ? "No se completó el pago"
              : "Solicitud recibida"}
        </h1>
        <p>
          {paid
            ? `Recibimos el abono de ${L(charter.name, "es")}. ${DEPOSIT_DISCLAIMER_ES}`
            : failed
              ? "El cobro no quedó registrado. Tu solicitud sigue en el sistema: escríbenos por WhatsApp y lo resolvemos."
              : pendingPay
                ? `Guardamos tu solicitud para ${L(charter.name, "es")}. Si el enlace de PagueloFácil no estaba listo, te enviamos el abono por WhatsApp.`
                : `Gracias. Recibimos tu solicitud para ${L(charter.name, "es")}.`}
        </p>
        <DepositDisclaimer />
        <div className="hero-actions" style={{ marginTop: 28 }}>
          <a className="button button-primary" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.whatsapp.display}
          </a>
          <Link className="button" href="/charters">
            Volver a charters
          </Link>
        </div>
      </div>
    </section>
  );
}
