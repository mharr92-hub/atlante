"use client";

import Link from "@/components/site/LocaleLink";
import { navItems, site } from "@/config/site";
import { destinations } from "@/content/destinations";
import { useLocale } from "@/lib/locale-context";
import { L, t } from "@/lib/i18n";
import PexDisclosure from "@/components/site/PexDisclosure";

const legalItems = [
  { href: "/aliados", key: "partners_eyebrow" },
  { href: "/como-funciona", key: "legal_how" },
  { href: "/terminos", key: "legal_terms" },
  { href: "/privacidad", key: "legal_privacy" },
  { href: "/cancelaciones", key: "legal_cancellations" },
] as const;

export default function Footer() {
  const { locale } = useLocale();
  return (
    <footer className="site-footer">
      <div className="section-inner footer-grid">
        <div>
          <Link className="brand" href="/" aria-label={site.name}>
            <span className="brand-mark" aria-hidden="true">
              A
            </span>
            <span>
              <strong>{site.shortName}</strong>
              <small>{site.tagline}</small>
            </span>
          </Link>
          <p>{t("footer_tagline", locale)}</p>
        </div>
        <nav aria-label={t("nav_footer", locale)}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {locale === "es" ? item.labelEs : item.labelEn}
            </Link>
          ))}
        </nav>
        <nav aria-label={t("destinos_eyebrow", locale)}>
          {destinations.map((d) => (
            <Link key={d.slug} href={`/destinos/${d.slug}`}>
              {L(d.name, locale)}
            </Link>
          ))}
        </nav>
        <nav aria-label={t("nav_legal", locale)}>
          {legalItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {t(item.key, locale)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="section-inner" style={{ marginTop: 24 }}>
        <PexDisclosure variant="inline" />
        <p className="copyright" style={{ marginTop: 12 }}>
          © {site.name}. {t("footer_rights", locale)}
        </p>
      </div>
    </footer>
  );
}
