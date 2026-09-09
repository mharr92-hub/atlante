import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getProduct, ticketProducts } from "@/content/catalog";
import { site } from "@/config/site";
import { L, type Locale } from "@/lib/i18n";
import Funnel from "@/components/funnel/Funnel";

export function generateStaticParams() {
  return ticketProducts.filter((p) => p.available).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("locale")?.value === "en" ? "en" : "es";
  return {
    title: `Reservar ${L(product.name, locale)}`,
    description: L(product.summary, locale),
    alternates: { canonical: `${site.url}/reservar/${product.slug}` },
  };
}

/**
 * Funnel de 3 clics. Los charters de PEX no pasan por aquí en este bloque:
 * su cierre es el checkout de PEX (la captura de lead llega en el bloque 4).
 */
export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product || !product.available || product.kind === "charter_pex") notFound();

  return (
    <Suspense fallback={<div className="funnel" />}>
      <Funnel product={product} />
    </Suspense>
  );
}
