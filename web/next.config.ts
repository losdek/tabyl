import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  poweredByHeader: false,
  devIndicators: false,
  // 7–8 KB of Tailwind: inlining saves a round trip on slow mobile networks
  experimental: { inlineCss: true },
  images: { unoptimized: true }, // photos are pre-sized by our own pipeline
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default nextConfig;
