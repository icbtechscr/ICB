import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SiteChromeGate } from "@/components/SiteChromeGate";
import { ChatWidget } from "@/components/ChatWidget";
import { CartProvider } from "@/lib/cart";
import { getNavMenu } from "@/lib/category-tree";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ICB Technologies — Tecnología y seguridad en Costa Rica",
    template: "%s — ICB Technologies",
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
    "ICB Technologies",
  ],
  openGraph: {
    type: "website",
    locale: "es_CR",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "ICB Technologies — Tecnología y seguridad en Costa Rica",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "ICB Technologies — Tecnología y seguridad en Costa Rica",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ICB Technologies — Tecnología y seguridad en Costa Rica",
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  icons: {
    // Favicon de la pestaña del navegador = logo de marca ICB.
    icon: [
      { url: "/icb-favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icb-favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icb-favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icb-favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // La misma identidad del carrito de ICB en navegador, móvil y buscadores.
    apple: "/icb-apple-touch-icon.png",
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
  const menu = await getNavMenu();
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(document.cookie.includes("site-theme=dark")){document.documentElement.classList.add("dark")}}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col text-ink-900">
        <CartProvider>
          <SiteChromeGate>
            <Header menu={menu} />
          </SiteChromeGate>
          <main className="flex-1">{children}</main>
          <SiteChromeGate>
            <Footer />
          </SiteChromeGate>
          <SiteChromeGate>
            <ChatWidget />
          </SiteChromeGate>
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
// Asistente virtual (ChatWidget) montado arriba vía SiteChromeGate.
