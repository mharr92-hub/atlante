import type { Metadata } from "next";
import PartnerForm from "@/components/charters/PartnerForm";
import { t } from "@/lib/i18n";
import { getLocale, pageAlternates } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: t("meta_signup_title", locale),
    description: t("meta_signup_desc", locale),
    alternates: await pageAlternates("/aliados/registro"),
  };
}

export default function AliadosRegistroPage() {
  return (
    <section className="section section-ivory" style={{ paddingTop: 120 }}>
      <div className="section-inner quote-layout">
        <PartnerForm />
      </div>
    </section>
  );
}
