import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import QuoteScreen from "@/components/charters/QuoteScreen";
import { getOperator, getVessel } from "@/lib/vessels";

// Formulario, no contenido: no se indexa (PRD 5.1).
export const metadata: Metadata = {
  title: "Cotizar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CotizarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vessel = await getVessel(slug);
  if (!vessel || !vessel.active) notFound();

  // Las naves que cierran en el checkout de PEX no se cotizan: a su ficha.
  if (vessel.closeMode !== "quote") redirect(`/charters/${vessel.slug}`);

  const operator = (await getOperator(vessel.operatorSlug)) ?? null;
  return (
    <div style={{ paddingTop: 90 }}>
      <QuoteScreen vessel={vessel} operator={operator} />
    </div>
  );
}
