import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  poweredByHeader: false,
  images: { unoptimized: true }, // photos are pre-sized by our own pipeline
};

export default nextConfig;
