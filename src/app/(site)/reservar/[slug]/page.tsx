import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProduct, getProductSlots, getTicketProducts } from "@/lib/catalog";
import { slotsAreFresh } from "@/lib/slots";
import { L, tf } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";
import Funnel from "@/components/funnel/Funnel";

export async function generateStaticParams() {
  const products = await getTicketProducts();
  return products.filter((p) => p.available).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const locale = await getLocale();
  return {
    title: tf("meta_book_title", locale, { name: L(product.name, locale) }),
    description: L(product.summary, locale),
    alternates: await pageAlternates(`/reservar/${product.slug}`),
  };
}

/**
 * Funnel de 3 clics. Los charters de PEX no pasan por aquí en este bloque:
 * su cierre es el checkout de PEX (la captura de lead llega en el bloque 4).
 *
 * Las salidas reales del feed (`ProductSlot`) se resuelven en el servidor y
 * viajan como prop. Con la lista vacía o con un snapshot de más de 24 h el
 * funnel se comporta igual que en el bloque 2: modo puente.
 */
export default async function ReservarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || !product.available || product.kind === "charter_pex") notFound();

  const { slots, syncedAt } = await getProductSlots(product.slug);
  const fresh = slotsAreFresh(slots, syncedAt);

  return (
    <Suspense fallback={<div className="funnel" />}>
      <Funnel product={product} slots={fresh ? slots : []} />
    </Suspense>
  );
}
