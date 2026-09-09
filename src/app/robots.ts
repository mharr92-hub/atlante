import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El admin es privado; `/listo` es una pantalla de tránsito y `/api/` no
      // es contenido.
      disallow: ["/admin", "/reservar/*/listo", "/api/"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
