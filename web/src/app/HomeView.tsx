import { cookies } from "next/headers";
import Link from "next/link";
import { getDb } from "@/db/client";
import { categoryBySlug } from "@/domain/categories";
import { cityBySlug } from "@/domain/places";
import { count, formatNumber, NBSP } from "@/lib/format";
import { countByCategory, countNewToday, mixPromoted, myAds, promotedAds, searchAds } from "@/server/ads";
import { filtersToQuery, parseFilters } from "@/server/filters";
import { favSet } from "@/server/guest-favs";
import { cardJSON } from "@/server/serialize";
import { currentUser } from "@/server/session";
import { AdCard } from "@/ui/AdCard";
import { Feed } from "@/ui/Feed";
import { Header } from "@/ui/Header";
import { Icon } from "@/ui/icons";

const Island = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-[24px] bg-bg px-3 py-4 md:rounded-[28px] md:px-6 md:py-6 ${className}`}>{children}</section>
);

function AllLink({ href, label = "Все" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="press flex h-9 shrink-0 items-center gap-1 rounded-full bg-field px-3.5 text-sm font-medium transition-colors hover:bg-line">
      {label} <Icon name="next" size={16} />
    </Link>
  );
}

/**
 * Home: islands on a tinted page — categories with icons, two helper cards,
 * a shelf per busy category, then the full fresh feed.
 */
export async function HomeView({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const jar = await cookies();
  const f = parseFilters(sp, jar.get("city")?.value ?? "bishkek");
  const db = await getDb();
  const user = await currentUser();
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const [page, promoted, today, perCat, mine] = await Promise.all([
    searchAds(db, f, { cursor }),
    cursor ? Promise.resolve([]) : promotedAds(db, f),
    countNewToday(db, f.city),
    countByCategory(db, f.city),
    user ? myAds(db, user.id) : Promise.resolve([]),
  ]);
  const shelves = perCat.filter((c) => c.n >= 3 && categoryBySlug(c.category)).slice(0, 3);
  const shelfPages = await Promise.all(shelves.map((c) => searchAds(db, { ...f, category: c.category }, { limit: 12 })));
  const items = mixPromoted(page.items, promoted);
  const allIds = [...items, ...shelfPages.flatMap((p) => p.items)].map((a) => a.id);
  const favs = await favSet(db, user, allIds);
  const city = f.city === "all" ? "по всему Кыргызстану" : cityBySlug(f.city)?.in ?? "";
  const now = new Date();
  const activeMine = mine.filter((a) => a.status === "active");
  const views = activeMine.reduce((s, a) => s + a.views, 0);
  const total = perCat.reduce((s, c) => s + c.n, 0);

  return (
    <>
      <Header isHome signedIn={!!user} filtersHref={`/search?${filtersToQuery(f)}#filters`} />
      <main id="results" className="mx-auto grid max-w-[1280px] gap-2.5 px-2 pt-2.5 md:gap-4 md:px-4 md:pt-4">

        <div className="no-scrollbar -mx-2 flex snap-x gap-2.5 overflow-x-auto px-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:px-0">
          <Island className="flex w-[78%] shrink-0 snap-start flex-col justify-between gap-4 md:w-auto">
            <div>
              <h2 className="text-lg font-medium">Продайте за минуту</h2>
              <p className="mt-1 text-sm text-mut">Фото, цена и пара слов — объявление сразу в ленте. Бесплатно.</p>
            </div>
            <Link href="/post" className="press flex h-11 items-center justify-center gap-1.5 self-start rounded-[12px] bg-sun px-4 font-medium text-on-sun"><Icon name="plus" size={20} />Подать объявление</Link>
          </Island>
          {user ? (
            <Island className="flex w-[78%] shrink-0 snap-start flex-col justify-between gap-4 md:w-auto">
              <div>
                <h2 className="text-lg font-medium">{activeMine.length ? "Ваши объявления" : `Здравствуйте${user.name ? `, ${user.name}` : ""}`}</h2>
                <p className="mt-1 text-sm text-mut">
                  {activeMine.length
                    ? `${count(activeMine.length, ["опубликовано", "опубликовано", "опубликовано"])} · ${count(views, ["просмотр", "просмотра", "просмотров"])} всего`
                    : "Сохранённые поиски и избранное — в профиле."}
                </p>
              </div>
              <Link href="/profile" className="press flex h-11 items-center self-start rounded-[12px] bg-field px-4 font-medium">Открыть профиль</Link>
            </Island>
          ) : (
            <Island className="flex w-[78%] shrink-0 snap-start flex-col justify-between gap-4 md:w-auto">
              <div>
                <h2 className="text-lg font-medium">Войдите по номеру</h2>
                <p className="mt-1 text-sm text-mut">Писать продавцам, получать новые по сохранённым поискам и видеть избранное на любом устройстве.</p>
              </div>
              <Link href="/login?mode=register" className="press flex h-11 items-center self-start rounded-[12px] bg-ink px-4 font-medium text-on-ink">Войти или зарегистрироваться</Link>
            </Island>
          )}
          <Island className="flex min-h-[200px] w-[86%] shrink-0 snap-start flex-col justify-between gap-5 md:min-h-[220px] md:w-auto">
            <div>
              <span className="mb-3 grid size-16 place-items-center rounded-full bg-sun text-on-sun"><Icon name="shield" size={34} /></span>
              <h2 className="text-xl font-medium tracking-tight md:text-2xl">Без предоплаты</h2>
              <p className="mt-1.5 text-[15px] text-mut">Встречайтесь в людных местах и проверяйте товар до оплаты. Табыл не присылает ссылки на оплату.</p>
            </div>
            <Link href="/rules" className="link self-start text-sm">Как не попасться мошенникам</Link>
          </Island>
        </div>

        {!cursor &&
          shelves.map((c, si) => {
            const cat = categoryBySlug(c.category)!;
            const list = shelfPages[si].items;
            return (
              <Island key={c.category}>
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <h2 className="text-lg font-medium md:text-xl">
                    {cat.name} <span className="ml-1 text-sm font-normal text-mut num">{formatNumber(c.n)}</span>
                  </h2>
                  <AllLink href={`/c/${cat.slug}`} />
                </div>
                <div className="no-scrollbar -mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 md:-mx-6 md:gap-4 md:px-6">
                  {list.map((a, i) => (
                    <AdCard key={a.id} ad={a} fav={favs.has(a.id)} shelf now={now} index={i} />
                  ))}
                </div>
              </Island>
            );
          })}

        <Island>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-lg font-medium md:text-xl">Новые {city}</h2>
              <p className="text-sm text-mut">сегодня {today}{total ? ` · всего${NBSP}${formatNumber(total)}` : ""}</p>
            </div>
            <AllLink href={`/search?${filtersToQuery(f)}`} />
          </div>
          {items.length ? (
            <Feed key={cursor ?? "first"} initial={items.map(cardJSON)} favs={[...favs]} nextCursor={page.nextCursor} query={filtersToQuery(f)} />
          ) : (
            <p className="px-1 py-10 text-center text-mut">Пока пусто — станьте первым, кто подаст объявление {city}.</p>
          )}
        </Island>
      </main>
    </>
  );
}
