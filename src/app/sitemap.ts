import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { tours } from "@/content/tours";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["", "/compare"].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const tourPages = tours.map((t) => ({
    url: `${site.url}/tours/${t.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  return [...staticPages, ...tourPages];
}
