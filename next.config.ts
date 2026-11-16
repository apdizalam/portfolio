import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  // old static-site URL: /project?p=slug -> /projects/slug
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/admin.html", destination: "/admin", permanent: true },
    ];
  },
};

export default nextConfig;
