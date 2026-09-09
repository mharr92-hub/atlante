import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CharterListo from "@/components/charters/CharterListo";
import { getVessel } from "@/lib/vessels";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

// Pantalla de tránsito: no se indexa (PRD 5.1) y siempre se renderiza fresca.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: t("meta_listo_title", await getLocale()),
    robots: { index: false, follow: false },
    alternates: { canonical: null },
  };
}

export const dynamic = "force-dynamic";

export default async function CharterListoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lead?: string }>;
}) {
  const { slug } = await params;
  const { lead } = await searchParams;
  const vessel = await getVessel(slug);
  if (!vessel || !vessel.active || vessel.closeMode !== "deeplink") notFound();

  return <CharterListo vessel={vessel} leadId={lead ?? null} />;
}
