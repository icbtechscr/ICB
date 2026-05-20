import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  title: "ICB Tech — Tecnología y seguridad en Costa Rica",
  description:
    "Computadoras, cámaras de seguridad, redes, periféricos y más. Distribuidor oficial Dahua, Hikvision, Uniview en Costa Rica.",
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
          <TopBar />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
