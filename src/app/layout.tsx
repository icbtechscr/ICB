import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SiteChromeGate } from "@/components/SiteChromeGate";
import { CartProvider } from "@/lib/cart";
import { getNavMenu } from "@/lib/category-tree";
import { getCurrentUser } from "@/lib/supabase-server";
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
  appleWebApp: {
    capable: true,
    title: "ICB Marcaje",
    statusBarStyle: "black-translucent",
  },
  icons: {
    // Favicon de la pestaña del navegador = logo de marca ICB.
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // Ícono de la app instalada en el celular = reloj+check (PWA).
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1840",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const menu = getNavMenu();
  const dark = (await cookies()).get("site-theme")?.value === "dark";
  const user = await getCurrentUser();
  return (
    <html lang="es" className={`h-full antialiased${dark ? " dark" : ""}`}>
      <body className="min-h-full flex flex-col text-ink-900">
        <CartProvider>
          <SiteChromeGate>
            <Header menu={menu} initialDark={dark} initialAuthed={!!user} />
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
