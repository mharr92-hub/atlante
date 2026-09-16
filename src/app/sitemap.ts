import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { liveCharters } from "@/data/charters";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["", "/charters"].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.9,
  }));
  const charterPages = liveCharters.map((c) => ({
    url: `${site.url}/charters/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  return [...staticPages, ...charterPages];
}
