"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { navItems, site, whatsappUrl } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function Header() {
  const { locale, setLocale } = useLocale();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`} data-header>
      <Link className="brand" href="/" aria-label={site.name}>
        <span className="brand-mark">A</span>
        <span>
          <strong>{site.shortName}</strong>
          <small>{site.tagline}</small>
        </span>
      </Link>

      <nav className="nav" aria-label="Principal">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {locale === "es" ? item.labelEs : item.labelEn}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <div className="lang-toggle" role="group" aria-label="Language">
          <button
            type="button"
            className={locale === "es" ? "is-active" : ""}
            onClick={() => setLocale("es")}
          >
            ES
          </button>
          <button
            type="button"
            className={locale === "en" ? "is-active" : ""}
            onClick={() => setLocale("en")}
          >
            EN
          </button>
        </div>

        <a
          className="nav-cta"
          href={whatsappUrl()}
          target="_blank"
          rel="noreferrer"
        >
          {t("nav_reserve", locale)}
        </a>
      </div>
    </header>
  );
}
