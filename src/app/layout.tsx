import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SiteChromeGate } from "@/components/SiteChromeGate";
import { CartProvider } from "@/lib/cart";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ICB Tech — Tecnología y seguridad en Costa Rica",
    template: "%s — ICB Tech",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "tecnología Costa Rica",
    "cámaras de seguridad",
    "computadoras",
    "redes",
    "POS",
    "Dahua",
    "Hikvision",
    "Uniview",
    "ICB Tech",
  ],
  openGraph: {
    type: "website",
    locale: "es_CR",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "ICB Tech — Tecnología y seguridad en Costa Rica",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "ICB Tech — Tecnología y seguridad en Costa Rica",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink-900 text-ink-900">
        <CartProvider>
          <SiteChromeGate>
            <TopBar />
            <Header />
          </SiteChromeGate>
          <main className="flex-1">{children}</main>
          <SiteChromeGate>
            <Footer />
          </SiteChromeGate>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
