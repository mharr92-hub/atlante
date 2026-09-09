import type { Metadata } from "next";
import PartnersPitch from "@/components/charters/PartnersPitch";
import { t } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("meta_partners_title", locale),
    description: t("meta_partners_desc", locale),
    alternates: await pageAlternates("/aliados"),
  };
}

export default function AliadosPage() {
  return (
    <div style={{ paddingTop: 90 }}>
      <PartnersPitch />
    </div>
  );
}
