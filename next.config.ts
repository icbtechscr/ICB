import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.icbtechscr.com" },
      { protocol: "https", hostname: "icbtechscr.com" },
      { protocol: "https", hostname: "fnnzlkvohsaxwnmdymvc.supabase.co" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
  },
};

export default nextConfig;
