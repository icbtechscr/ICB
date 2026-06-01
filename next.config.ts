import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Sirve AVIF/WebP (mucho más livianos que los PNG originales).
    formats: ["image/avif", "image/webp"],
    // Cachea las imágenes optimizadas por 31 días.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      { protocol: "https", hostname: "www.icbtechscr.com" },
      { protocol: "https", hostname: "icbtechscr.com" },
      // Host de medios (WordPress legacy): subdominio que se queda en el cPanel
      // y sirve las imágenes tras migrar el dominio principal a Vercel.
      { protocol: "https", hostname: "cdn.icbtechscr.com" },
      { protocol: "https", hostname: "fnnzlkvohsaxwnmdymvc.supabase.co" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
  },
};

export default nextConfig;
