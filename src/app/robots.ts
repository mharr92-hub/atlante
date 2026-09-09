import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El admin es privado; las pantallas de salto y el formulario de
      // cotización son tránsito, y `/api/` no es contenido.
      disallow: [
        "/admin",
        "/reservar/*/listo",
        "/charters/*/listo",
        "/cotizar",
        "/api/",
      ],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
