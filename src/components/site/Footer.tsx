"use client";

import Link from "next/link";
import { navItems, site } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import PexDisclosure from "@/components/site/PexDisclosure";

const legalItems = [
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
            <span className="brand-mark">A</span>
            <span>
              <strong>{site.shortName}</strong>
              <small>{site.tagline}</small>
            </span>
          </Link>
          <p>
            {locale === "es"
              ? "Experiencias privadas en el oceano."
              : "Private experiences on the ocean."}
          </p>
        </div>
        <nav aria-label="Footer">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {locale === "es" ? item.labelEs : item.labelEn}
            </Link>
          ))}
        </nav>
        <nav aria-label={locale === "es" ? "Legal" : "Legal"}>
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
          © {site.name}.{" "}
          {locale === "es"
            ? "Todos los derechos reservados."
            : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
