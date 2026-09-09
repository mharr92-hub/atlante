import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/config/site";
import { L } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { alternatesFor } from "@/lib/locale-routing";
import Providers from "@/components/Providers";

/**
 * Metadata raíz. Desde el bloque 6.2 se resuelve por petición porque el idioma
 * lo decide la URL (`/en/*`), y con él cambian el título, la descripción y el
 * canonical. `alternates` de la home declara las dos versiones + `x-default`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const description = L(site.description, locale);

  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.name} | ${L(site.titleSuffix, locale)}`,
      template: `%s | ${site.name}`,
    },
    description,
    keywords: [
      "tours Panama",
      "charter Panama",
      "yate privado Panama",
      "Taboga",
      "Las Perlas",
      "evening cruise Panama City",
      "boat rental Panama",
    ],
    authors: [{ name: site.name }],
    openGraph: {
      type: "website",
      siteName: site.name,
      title: site.name,
      description,
      url: site.url,
      locale: locale === "en" ? "en_US" : "es_PA",
      images: [{ url: "/og-atlante.jpg", width: 1200, height: 630, alt: site.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: site.name,
      description,
      images: ["/og-atlante.jpg"],
    },
    icons: { icon: "/favicon.png" },
    alternates: alternatesFor("/", locale),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
