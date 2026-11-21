import { cookies } from "next/headers";
import Link from "next/link";
import { getDb } from "@/db/client";
import { favSet } from "@/server/guest-favs";
import { CATEGORIES, categoryBySlug } from "@/domain/categories";
import { count } from "@/lib/format";
import { countAds, countNewToday, mixPromoted, promotedAds, searchAds } from "@/server/ads";
import { activeFilterCount, describeFilters, filtersToQuery, parseFilters } from "@/server/filters";
import { cardJSON } from "@/server/serialize";
import { currentUser } from "@/server/session";
import { cityBySlug } from "@/domain/places";
import { Feed } from "@/ui/Feed";
import { FilterForm } from "@/ui/FilterForm";
import { Header } from "@/ui/Header";
import { SaveSearchButton } from "@/ui/SaveSearchButton";

type SP = Record<string, string | string[] | undefined>;

/** Home, search and category pages are the same view with different defaults. */
export async function SearchView({ sp, mode, category }: { sp: SP; mode: "home" | "search" | "category"; category?: string }) {
  const jar = await cookies();
  const defaultCity = jar.get("city")?.value ?? "bishkek";
  const f = parseFilters(category ? { ...sp, cat: category } : sp, defaultCity);
  const db = await getDb();
  const user = await currentUser();
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const [page, promoted, total, today] = await Promise.all([
    searchAds(db, f, { cursor }),
    cursor ? Promise.resolve([]) : promotedAds(db, f),
    mode === "home" ? Promise.resolve(0) : countAds(db, f),
    mode === "home" ? countNewToday(db, f.city) : Promise.resolve(0),
  ]);
  const items = mixPromoted(page.items, promoted);
  const favs = await favSet(db, user, items.map((a) => a.id));
  const query = filtersToQuery(f);
  const cat = categoryBySlug(f.category);
  const city = f.city === "all" ? "по всему Кыргызстану" : cityBySlug(f.city)?.in ?? "";

  return (
    <>
      <Header
        q={f.q}
        isHome={mode === "home"}
        signedIn={!!user}
        filtersHref={`/search?${query}#filters`}
        activeFilters={activeFilterCount(f)}
        live={mode !== "home"}
      />
      <main id="results" className="mx-auto mt-2.5 max-w-[1280px] rounded-[24px] bg-bg px-3 pb-2 md:mx-4 md:mt-4 md:rounded-[28px] md:px-6 xl:mx-auto">
        {mode === "home" ? (
          <nav aria-label="Категории" className="no-scrollbar -mx-3 flex gap-5 overflow-x-auto px-4 pt-2.5 pb-1 text-[15px] whitespace-nowrap md:mx-0 md:gap-7 md:px-0">
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="flex min-h-9 items-center">
                {c.name}
              </Link>
            ))}
          </nav>
        ) : (
          <details id="filters" className="group border-b border-line" open={sp.f === "1" || undefined}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-1 text-sm [&::-webkit-details-marker]:hidden">
              <span className="truncate">{describeFilters(f)}</span>
              <span className="pseudo shrink-0">
                <span className="group-open:hidden">изменить</span>
                <span className="hidden group-open:inline">свернуть</span>
              </span>
            </summary>
            <FilterForm f={f} action={mode === "category" && cat ? `/c/${cat.slug}` : "/search"} />
          </details>
        )}

        <div className="flex items-baseline justify-between gap-3 px-1 pt-4 pb-3">
          {mode === "home" ? (
            <h2 className="text-lg font-medium">
              Новые {city} <span className="ml-1 text-sm font-normal text-mut">сегодня {today}</span>
            </h2>
          ) : (
            <h1 className="text-sm text-mut">
              {cat && mode === "category" ? <span className="mr-2 text-lg font-medium text-fg">{cat.name}</span> : null}
              <span className="num font-medium text-fg">{count(total, ["объявление", "объявления", "объявлений"])}</span>
            </h1>
          )}
          {mode !== "home" && user && (f.q || f.category) ? <SaveSearchButton query={query} /> : null}
        </div>

        {items.length ? (
          <Feed key={`${query}|${cursor ?? ""}`} initial={items.map(cardJSON)} favs={[...favs]} nextCursor={page.nextCursor} query={query} />
        ) : (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-lg">Ничего не нашлось</p>
            <p className="mt-2 text-sm text-mut">
              Попробуйте убрать часть фильтров или поискать {f.city === "all" ? "другими словами" : "по всему Кыргызстану"}.
            </p>
            {f.city !== "all" && (
              <Link href={`/search?${filtersToQuery({ ...f, city: "all" })}`} className="link mt-4 inline-block text-sm">
                Искать по всей стране
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
