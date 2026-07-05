import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { site } from "@/config/site";
import type { Locale } from "@/lib/i18n";
import Providers from "@/components/Providers";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsAppFloat from "@/components/site/WhatsAppFloat";
import LeadPopups from "@/components/marketing/LeadPopups";
import Analytics from "@/components/marketing/Analytics";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Tours y charters privados en Panama`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "tours Panama",
    "charter Panama",
    "yate privado Panama",
    "Taboga",
    "Las Perlas",
    "sunset cruise Panama City",
    "boat rental Panama",
  ],
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.name,
    description: site.description,
    url: site.url,
    images: [{ url: "/og-atlante.jpg", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
    images: ["/og-atlante.jpg"],
  },
  icons: { icon: "/favicon.png" },
  alternates: { canonical: site.url },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const initialLocale: Locale = cookieLocale === "en" ? "en" : "es";

  return (
    <html lang={initialLocale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers initialLocale={initialLocale}>
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppFloat />
          <LeadPopups />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
