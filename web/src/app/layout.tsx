import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { currentUser } from "@/server/session";
import { getDb } from "@/db/client";
import { unreadCount } from "@/server/chat";
import { TabBar } from "@/ui/TabBar";
import "./globals.css";

const rubik = localFont({
  src: [
    { path: "../fonts/rubik-cyrillic-wght-normal.woff2", weight: "300 800", style: "normal" },
    { path: "../fonts/rubik-latin-wght-normal.woff2", weight: "300 800", style: "normal" },
  ],
  variable: "--font-rubik",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.TABYL_ORIGIN ?? "http://localhost:3000"),
  title: { default: "Табыл — объявления в Кыргызстане", template: "%s — Табыл" },
  description: "Покупайте и продавайте рядом: транспорт, квартиры, электроника, работа и услуги по всему Кыргызстану.",
  manifest: "/manifest.webmanifest",
  openGraph: { siteName: "Табыл", locale: "ru_KG", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#14120d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = (await cookies()).get("theme")?.value;
  const user = await currentUser();
  const unread = user ? await unreadCount(await getDb(), user.id) : 0;
  return (
    <html lang="ru" className={rubik.variable} data-theme={theme === "dark" || theme === "light" ? theme : undefined}>
      <body className="min-h-dvh pb-[76px] md:pb-0">
        {children}
        <TabBar unread={unread} />
      </body>
    </html>
  );
}
