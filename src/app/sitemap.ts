import type { MetadataRoute } from "next";
import { getTicketProducts } from "@/lib/catalog";
import { getVessels } from "@/lib/vessels";
import { destinationSlugs } from "@/content/destinations";
import { languageAlternates, localeUrl } from "@/lib/locale-routing";

/**
 * Sólo páginas que responden 200. Las fichas de productos que PEX no está
 * vendiendo (`available: false`) devuelven 404, así que no se listan; los seis
 * productos inventados de antes de R0 siguen redirigidos en `next.config.ts`.
 *
 * Las rutas de `/reservar` tampoco entran: son un formulario, no contenido, y
 * la pantalla de salto a PEX va además con `noindex`.
 *
 * Desde el bloque 6.2 cada entrada es la URL en español con sus `alternates`
 * (`es`, `en` y `x-default`), que es la forma que recomienda Google para
 * declarar hreflang en el sitemap: una sola entrada por página, no dos.
 */
const staticPaths: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/tours", priority: 0.9 },
  { path: "/charters", priority: 0.9 },
  { path: "/charters/comparar", priority: 0.6 },
  ...destinationSlugs.map((slug) => ({ path: `/destinos/${slug}`, priority: 0.7 })),
  { path: "/aliados", priority: 0.5 },
  { path: "/aliados/registro", priority: 0.4 },
  { path: "/como-funciona", priority: 0.6 },
  { path: "/terminos", priority: 0.3 },
  { path: "/privacidad", priority: 0.3 },
  { path: "/cancelaciones", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const products = (await getTicketProducts())
    .filter((p) => p.available)
    .map((p) => ({ path: `/tours/${p.slug}`, priority: 0.8 }));

  const vessels = (await getVessels()).map((v) => ({
    path: `/charters/${v.slug}`,
    priority: 0.8,
  }));

  return [...staticPaths, ...products, ...vessels].map(({ path, priority }) => ({
    url: localeUrl(path, "es"),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
    alternates: { languages: languageAlternates(path) },
  }));
}
