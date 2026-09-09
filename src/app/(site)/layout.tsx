import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsAppFloat from "@/components/site/WhatsAppFloat";
import Analytics from "@/components/marketing/Analytics";

/** Public marketing layout — chrome that the admin area does not share. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppFloat />
      <Analytics />
    </>
  );
}
