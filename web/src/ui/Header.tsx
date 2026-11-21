import Link from "next/link";
import { Icon } from "./icons";
import { Logo } from "./Logo";

/**
 * Logo + search, nothing else on phones (navigation lives in the tab bar).
 * On wide screens the nav and «Подать объявление» sit on the same row.
 * The logo is not a link on the home page (Ководство §75).
 */
export function Header({
  q = "",
  isHome = false,
  signedIn,
  unread = 0,
  filtersHref,
  activeFilters = 0,
}: {
  q?: string;
  isHome?: boolean;
  signedIn: boolean;
  unread?: number;
  filtersHref?: string;
  activeFilters?: number;
}) {
  const logo = <Logo className="h-[22px] w-auto md:h-[26px]" />;
  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85 border-b border-line md:border-line">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-3 pt-2 pb-2.5 md:flex-row md:items-center md:gap-5 md:px-8 md:py-3.5">
        <div className="flex min-h-11 items-center px-1 md:px-0">
          {isHome ? <h1 className="m-0">{logo}</h1> : <Link href="/" aria-label="Табыл — на главную">{logo}</Link>}
        </div>
        <form action="/search" role="search" className="flex h-12 flex-1 items-center gap-2.5 rounded-[12px] bg-field pl-3.5 pr-1 md:max-w-[640px]">
          <Icon name="search" />
          <input
            name="q"
            defaultValue={q}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Что ищете?"
            aria-label="Поиск по объявлениям"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-mut"
          />
          {filtersHref ? (
            <Link href={filtersHref} className="relative grid size-11 place-items-center" aria-label="Фильтры">
              <Icon name="filter" />
              {activeFilters > 0 && (
                <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-sun text-[10px] font-medium text-on-sun">
                  {activeFilters}
                </span>
              )}
            </Link>
          ) : null}
        </form>
        <nav className="ml-auto hidden items-center gap-1 text-sm md:flex" aria-label="Разделы">
          <Link href="/favorites" className="flex min-h-11 items-center gap-1.5 px-3"><Icon name="heart" size={20} />Избранное</Link>
          <Link href="/chats" className="relative flex min-h-11 items-center gap-1.5 px-3">
            <Icon name="chat" size={20} />Чаты
            {unread > 0 && <span className="rounded-full bg-ink px-1.5 text-[11px] leading-[18px] text-on-ink">{unread}</span>}
          </Link>
          <Link href={signedIn ? "/profile" : "/login"} className="flex min-h-11 items-center gap-1.5 px-3">
            <Icon name="user" size={20} />{signedIn ? "Профиль" : "Войти"}
          </Link>
          <Link href="/post" className="ml-2 flex min-h-11 items-center gap-1.5 rounded-[12px] bg-sun px-4 font-medium text-on-sun">
            <Icon name="plus" size={20} />Подать объявление
          </Link>
        </nav>
      </div>
    </header>
  );
}
