import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { cityName } from "@/domain/places";
import { count, lastSeen, memberSince, NBSP, relativeTime } from "@/lib/format";
import { favoriteIds, searchAds } from "@/server/ads";
import { canReview, reviewsFor, sellerRating } from "@/server/reviews";
import { currentUser } from "@/server/session";
import { AdCard, Masonry } from "@/ui/AdCard";
import { Header } from "@/ui/Header";
import { ReplyForm, ReviewForm } from "./ReviewForms";

export async function generateMetadata(props: PageProps<"/u/[id]">): Promise<Metadata> {
  const [u] = await (await getDb()).select().from(users).where(eq(users.id, (await props.params).id));
  return u ? { title: `${u.name || "Продавец"} — объявления` } : {};
}

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function SellerPage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  const db = await getDb();
  const [seller] = await db.select().from(users).where(eq(users.id, id));
  if (!seller || seller.bannedAt) notFound();
  const me = await currentUser();
  const [page, rating, list, reviewConv] = await Promise.all([
    searchAds(db, { userId: id, city: "all" }, { limit: 60 }),
    sellerRating(db, id),
    reviewsFor(db, id),
    me ? canReview(db, me.id, id) : Promise.resolve(null),
  ]);
  const favs = await favoriteIds(db, me?.id, page.items.map((a) => a.id));
  return (
    <>
      <Header signedIn={!!me} />
      <main className="mx-auto max-w-[1280px] px-3 pt-4 md:px-8">
        <section className="flex items-center gap-4 px-1">
          <span className="grid size-16 place-items-center rounded-full bg-field text-2xl font-medium">{(seller.name || "П").slice(0, 1).toUpperCase()}</span>
          <div>
            <h1 className="text-xl font-medium">{seller.name || "Продавец"}</h1>
            <p className="text-sm text-mut">
              {rating.count ? <>★{NBSP}{String(rating.avg).replace(".", ",")} · {count(rating.count, ["отзыв", "отзыва", "отзывов"])} · </> : "Пока без отзывов · "}
              {cityName(seller.city)} · {lastSeen(seller.lastSeenAt)}
            </p>
            <p className="text-xs text-mut">{memberSince(seller.createdAt)}</p>
          </div>
        </section>

        <h2 className="px-1 pt-8 pb-3 text-lg font-medium">{count(page.items.length, ["объявление", "объявления", "объявлений"])}</h2>
        {page.items.length ? <Masonry>{page.items.map((a) => <AdCard key={a.id} ad={a} fav={favs.has(a.id)} />)}</Masonry> : <p className="px-1 text-sm text-mut">Сейчас ничего не продаёт</p>}

        <section id="reviews" className="mx-auto max-w-2xl px-1 pt-8 pb-10">
          <h2 className="pb-3 text-lg font-medium">Отзывы</h2>
          {reviewConv && <ReviewForm sellerId={id} />}
          {list.length === 0 ? (
            <p className="text-sm text-mut">Отзывы оставляют покупатели после переписки с продавцом.</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.map(({ review: r, author }) => (
                <li key={r.id} className="py-4">
                  <p className="text-sm">
                    <span className="mr-2 tracking-wider text-fg" aria-label={`${r.rating} из 5`}>{stars(r.rating)}</span>
                    <span className="font-medium">{author.name || "Покупатель"}</span>
                    <span className="text-mut"> · {relativeTime(r.createdAt)}</span>
                  </p>
                  {r.text && <p className="mt-1.5 text-[15px] whitespace-pre-line">{r.text}</p>}
                  {r.reply ? (
                    <p className="mt-2 border-l-2 border-line pl-3 text-sm text-mut"><span className="text-fg">Ответ продавца:</span> {r.reply}</p>
                  ) : me?.id === id ? (
                    <ReplyForm reviewId={r.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
