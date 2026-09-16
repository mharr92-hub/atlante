"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { navItems, site } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { useCurrency } from "@/lib/currency-context";
import { t } from "@/lib/i18n";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";

export default function Header() {
  const { locale, setLocale } = useLocale();
  const { currency, setCurrency } = useCurrency();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const solid = scrolled || pathname !== "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={`site-header${solid ? " is-scrolled" : ""}${menuOpen ? " is-open" : ""}`}
      data-header
    >
      <Link className="brand" href="/" aria-label={site.name} onClick={() => setMenuOpen(false)}>
        <span className="brand-mark">A</span>
        <span>
          <strong>{site.shortName}</strong>
          <small>{site.tagline}</small>
        </span>
      </Link>

      <button
        type="button"
        className="nav-toggle"
        aria-expanded={menuOpen}
        aria-controls="site-nav"
        aria-label={menuOpen ? (locale === "es" ? "Cerrar menú" : "Close menu") : (locale === "es" ? "Abrir menú" : "Open menu")}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
      </button>

      <nav id="site-nav" className="nav" aria-label="Principal">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
            {locale === "es" ? item.labelEs : item.labelEn}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <select
          className="currency-select"
          aria-label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        >
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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

        <Link className="nav-cta" href="/charters" onClick={() => setMenuOpen(false)}>
          {t("nav_reserve", locale)}
        </Link>
      </div>
    </header>
  );
}
