import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import QuoteScreen from "@/components/charters/QuoteScreen";
import { getOperator, getVessel } from "@/lib/vessels";
import { t } from "@/lib/i18n";
import { getLocale, localeRedirect } from "@/lib/locale-server";

// Formulario, no contenido: no se indexa (PRD 5.1).
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: t("meta_quote_title", await getLocale()),
    robots: { index: false, follow: false },
    alternates: { canonical: null },
  };
}

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
  // La redirección conserva el idioma de la URL de entrada (bloque 6.2).
  if (vessel.closeMode !== "quote") {
    redirect(await localeRedirect(`/charters/${vessel.slug}`));
  }

  const operator = (await getOperator(vessel.operatorSlug)) ?? null;
  return (
    <div style={{ paddingTop: 90 }}>
      <QuoteScreen vessel={vessel} operator={operator} />
    </div>
  );
}
