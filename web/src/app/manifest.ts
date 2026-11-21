import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Табыл — объявления в Кыргызстане",
    short_name: "Табыл",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7ee",
    theme_color: "#fbf7ee",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
