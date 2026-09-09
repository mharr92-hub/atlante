import type { Metadata } from "next";
import { Suspense } from "react";
import CompareTable from "@/components/charters/CompareTable";
import { getVessels } from "@/lib/vessels";
import { t } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("meta_compare_title", locale),
    description: t("meta_compare_desc", locale),
    alternates: await pageAlternates("/charters/comparar"),
  };
}

export default async function CompararPage() {
  const vessels = await getVessels();

  return (
    <div style={{ paddingTop: 90 }}>
      <Suspense fallback={<div className="section section-ivory" />}>
        <CompareTable vessels={vessels} />
      </Suspense>
    </div>
  );
}
