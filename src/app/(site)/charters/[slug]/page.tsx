import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLiveCharter, liveCharters } from "@/data/charters";
import { site } from "@/config/site";
import { L, type Locale } from "@/lib/i18n";
import CharterFicha from "@/components/charter/CharterFicha";

export function generateStaticParams() {
  return liveCharters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const charter = getLiveCharter(slug);
  if (!charter) return {};
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("locale")?.value === "en" ? "en" : "es";
  const title = L(charter.name, locale);
  const description = L(charter.summary, locale);
  const url = `${site.url}/charters/${charter.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: charter.heroImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function CharterFichaPage({
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

  return <CharterFicha charter={charter} initialDurationId={hours} />;
}
