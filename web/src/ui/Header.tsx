import Link from "next/link";
import { Suspense } from "react";
import { Icon, type IconName } from "./icons";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";

function NavItem({ href, icon, label, badge = 0 }: { href: string; icon: IconName; label: string; badge?: number }) {
  return (
    <Link href={href} className="press relative flex min-w-16 flex-col items-center gap-0.5 rounded-[12px] px-2 py-1 text-xs transition-colors hover:bg-field">
      <Icon name={icon} />
      {label}
      {badge > 0 && <span className="num absolute top-0 right-3 min-w-4 rounded-full bg-ink px-1 text-center text-[10px] leading-4 text-on-ink">{badge}</span>}
    </Link>
  );
}

/**
 * A floating rounded panel: logo + search on phones (navigation lives in the
 * tab bar); on wide screens the labelled icons and «Подать» join the row.
 * The logo is not a link on the home page (Ководство §75).
 */
export function Header({
  q = "",
  isHome = false,
  signedIn,
  unread = 0,
  filtersHref,
  activeFilters = 0,
  live = false,
}: {
  q?: string;
  isHome?: boolean;
  signedIn: boolean;
  unread?: number;
  filtersHref?: string;
  activeFilters?: number;
  live?: boolean;
}) {
  const logo = <Logo className="h-[22px] w-auto md:h-[26px]" />;
  return (
    <header className="sticky top-0 z-30 px-2 pt-2 md:px-4 md:pt-3">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 rounded-[22px] bg-bg/95 px-3 pt-1.5 pb-2.5 shadow-[0_6px_24px_-16px_rgba(29,26,18,.35)] backdrop-blur md:flex-row md:items-center md:gap-5 md:rounded-[26px] md:px-6 md:py-3">
        <div className="flex min-h-11 items-center px-1 md:px-0">
          {isHome ? <h1 className="m-0">{logo}</h1> : <Link href="/" aria-label="Табыл — на главную">{logo}</Link>}
        </div>
        <Suspense fallback={<div className="h-12 flex-1 rounded-[12px] bg-field md:max-w-[620px]" />}>
          <SearchBox q={q} live={live} filtersHref={filtersHref} activeFilters={activeFilters} />
        </Suspense>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Разделы">
          <NavItem href="/favorites" icon="heart" label="Избранное" />
          <NavItem href="/chats" icon="chat" label="Чаты" badge={unread} />
          <NavItem href={signedIn ? "/profile" : "/login"} icon="user" label={signedIn ? "Профиль" : "Войти"} />
          <Link href="/post" className="press ml-2 flex min-h-12 items-center gap-1.5 rounded-[14px] bg-sun px-4 font-medium text-on-sun transition-transform">
            <Icon name="plus" size={20} />Подать объявление
          </Link>
        </nav>
      </div>
    </header>
  );
}
