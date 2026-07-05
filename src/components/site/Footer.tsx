"use client";

import Link from "next/link";
import { navItems, site } from "@/config/site";
import { useLocale } from "@/lib/locale-context";

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
        <p className="copyright">
          © {site.name}.{" "}
          {locale === "es"
            ? "Todos los derechos reservados."
            : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
