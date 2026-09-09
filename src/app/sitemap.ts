import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * Only pages that answer with 200. The six placeholder product pages and
 * `/compare` are 301'd in `next.config.ts`, so they are not listed here.
 */
const paths: Array<{ path: string; priority: number }> = [
  { path: "", priority: 1 },
  { path: "/tours", priority: 0.9 },
  { path: "/charters", priority: 0.9 },
  { path: "/como-funciona", priority: 0.6 },
  { path: "/terminos", priority: 0.3 },
  { path: "/privacidad", priority: 0.3 },
  { path: "/cancelaciones", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map(({ path, priority }) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
  }));
}
