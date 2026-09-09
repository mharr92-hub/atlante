import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import Listo from "@/components/funnel/Listo";

// Pantalla de tránsito: no se indexa (PRD 5.1) y siempre se renderiza fresca.
// Sin `alternates`: lo que no se indexa no declara hreflang.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: t("meta_listo_title", await getLocale()),
    robots: { index: false, follow: false },
    // Sin canonical ni hreflang heredados de la raíz: esta pantalla no es una
    // página de contenido y no se declara en ningún idioma.
    alternates: { canonical: null },
  };
}

export const dynamic = "force-dynamic";

export default async function ListoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lead?: string }>;
}) {
  const { slug } = await params;
  const { lead } = await searchParams;
  const product = await getProduct(slug);
  if (!product || !product.available) notFound();

  return <Listo product={product} leadId={lead ?? null} />;
}
