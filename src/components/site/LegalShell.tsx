import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

/**
 * Shell for the static/legal pages. Every one of them ships with the BORRADOR
 * strip until Mark reviews the wording (PRD 5.10 / decision #7).
 */
export default function LegalShell({
  locale,
  title,
  children,
}: {
  locale: Locale;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="legal-page">
      <div className="section-inner legal-body">
        <strong className="draft-banner">{t("draft_notice", locale)}</strong>
        <h1 style={{ fontSize: "clamp(40px,7vw,72px)" }}>{title}</h1>
        {children}
      </div>
    </section>
  );
}
