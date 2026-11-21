"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/favorites", label: "Избранное", icon: "heart" },
  { href: "/post", label: "Подать", icon: "plus" },
  { href: "/chats", label: "Чаты", icon: "chat" },
  { href: "/profile", label: "Профиль", icon: "user" },
];

/** Phone-only bottom navigation. Hidden inside a chat thread and on the posting form. */
export function TabBar({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  if (/^\/chats\/.+|^\/post|^\/ad\/|^\/login|^\/promote|^\/admin/.test(path)) return null;
  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-bg px-2 pt-1 pb-[max(env(safe-area-inset-bottom),12px)] text-[11px] text-mut md:hidden"
    >
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        if (t.icon === "plus")
          return (
            <Link key={t.href} href={t.href} aria-label="Подать объявление" className="grid h-[42px] w-[52px] place-items-center rounded-[12px] bg-sun text-on-sun">
              <Icon name="plus" />
            </Link>
          );
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex min-h-[46px] min-w-[56px] flex-col items-center justify-center gap-0.5 ${on ? "font-medium text-fg" : ""}`}
          >
            <Icon name={t.icon} />
            {t.label}
            {t.icon === "chat" && unread > 0 && (
              <span className="absolute top-0.5 right-2.5 min-w-4 rounded-full bg-ink px-1 text-center text-[10px] leading-4 text-on-ink">{unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
