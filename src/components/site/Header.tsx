"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "@/components/site/LocaleLink";
import { navItems, site } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { localePath, splitLocalePath } from "@/lib/locale-routing";

export default function Header() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * Selector de idioma (bloque 6.2): cada botón es un enlace a la MISMA página
   * en el otro idioma. Se usa `<a>` y no `next/link` a propósito: cambiar de
   * idioma recarga la página entera, que es lo que garantiza que el `lang` del
   * documento, el layout y todo el texto queden en el idioma nuevo.
   *
   * `usePathname()` puede devolver la ruta con prefijo o ya reescrita según el
   * momento; `splitLocalePath` quita el que haya y deja siempre la ruta base, así
   * que el destino sale bien en los dos casos.
   */
  const base = splitLocalePath(pathname || "/").path;

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`} data-header>
      <Link className="brand" href="/" aria-label={site.name}>
        <span className="brand-mark" aria-hidden="true">
          A
        </span>
        <span>
          <strong>{site.shortName}</strong>
          <small>{site.tagline}</small>
        </span>
      </Link>

      <nav className="nav" aria-label={t("nav_main", locale)}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {locale === "es" ? item.labelEs : item.labelEn}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <div className="lang-toggle" role="group" aria-label={t("nav_language", locale)}>
          <a
            className={locale === "es" ? "is-active" : ""}
            href={localePath(base, "es")}
            hrefLang="es"
            aria-current={locale === "es" ? "true" : undefined}
          >
            ES
          </a>
          <a
            className={locale === "en" ? "is-active" : ""}
            href={localePath(base, "en")}
            hrefLang="en"
            aria-current={locale === "en" ? "true" : undefined}
          >
            EN
          </a>
        </div>

        {/* R1: el CTA del header entra al catálogo, no a WhatsApp. Ahora hay un
            funnel real y WhatsApp queda como canal de rescate (botón flotante). */}
        <Link className="nav-cta" href="/tours">
          {t("nav_reserve", locale)}
        </Link>
      </div>
    </header>
  );
}
