import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/catalog";
import Listo from "@/components/funnel/Listo";

// Pantalla de tránsito: no se indexa (PRD 5.1) y siempre se renderiza fresca.
export const metadata: Metadata = {
  title: "Te llevamos a Pacific Experience",
  robots: { index: false, follow: false },
};

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
