"use client";

import NextLink from "next/link";
import { useLocale } from "@/lib/locale-context";
import { localeHref } from "@/lib/locale-routing";

/**
 * `next/link` que respeta el idioma de la página (bloque 6.2).
 *
 * En español no toca nada; en inglés antepone `/en` a cualquier `href` interno,
 * conservando query y ancla. Lo externo (`https://`, `mailto:`, `#ancla`) pasa
 * intacto. Así, una vez dentro de `/en/*`, ningún clic devuelve al visitante al
 * español sin querer.
 *
 * Los componentes públicos importan este archivo en lugar de `next/link`; el
 * selector ES/EN del header es la excepción, porque su destino es justamente el
 * otro idioma.
 */
export default function LocaleLink({
  href,
  ...rest
}: React.ComponentProps<typeof NextLink>) {
  const { locale } = useLocale();
  const target = typeof href === "string" ? localeHref(href, locale) : href;
  return <NextLink href={target} {...rest} />;
}
