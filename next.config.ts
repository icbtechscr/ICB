import type { NextConfig } from "next";

const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

const nextConfig: NextConfig = {
  // Permite ejecutar la aplicación como un contenedor autónomo en Coolify.
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/inicio",
        destination: "/",
        permanent: true,
      },
      {
        source: "/tienda/:path*",
        destination: "/productos",
        permanent: true,
      },
      {
        source: "/producto/:slug",
        destination: "/productos/:slug",
        permanent: true,
      },
      {
        source: "/productos/componentes",
        destination: "/categoria/componentes",
        permanent: true,
      },
      {
        // La categor\u00eda se renombr\u00f3 a Seguridad; se conserva la URL anterior
        // para enlaces existentes y para que los buscadores transfieran su se\u00f1al SEO.
        source: "/categoria/argom-soportes-tv",
        destination: "/categoria/seguridad",
        permanent: true,
      },
      {
        source: "/envio-devoluciones-y-pago",
        destination: "/envios",
        permanent: true,
      },
      {
        source: "/metodos-de-envio",
        destination: "/envios",
        permanent: true,
      },
      {
        source: "/politica-privacidad",
        destination: "/privacidad",
        permanent: true,
      },
      {
        source: "/acerca-de-nosotros",
        destination: "/sobre-nosotros",
        permanent: true,
      },
    ];
  },
  images: {
    // En pruebas LAN servimos las imágenes directamente. No habilitar
    // dangerouslyAllowLocalIP: expondría el optimizador a peticiones internas.
    unoptimized: storageUrl?.protocol === "http:",
    maximumDiskCacheSize: 512 * 1024 * 1024,
    // Sirve AVIF/WebP (mucho más livianos que los PNG originales).
    formats: ["image/avif", "image/webp"],
    // Cachea las imágenes optimizadas por 31 días.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    remotePatterns: [
      ...(storageUrl?.protocol === "https:" ? [{
        protocol: "https" as const,
        hostname: storageUrl.hostname,
        port: storageUrl.port,
        pathname: "/storage/v1/object/public/**",
        search: "",
      }] : []),
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
