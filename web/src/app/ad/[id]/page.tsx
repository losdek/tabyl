import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { favSet } from "@/server/guest-favs";
import { ads } from "@/db/schema";
import { attrSummary } from "@/domain/categories";
import { cityName } from "@/domain/places";
import { count, formatNumber, formatPrice, lastSeen, memberSince, NBSP, relativeTime, somHint } from "@/lib/format";
import { countView, getAd, photosFor } from "@/server/ads";
import { sellerRating } from "@/server/reviews";
import { currentUser, isAdmin } from "@/server/session";
import { AdCard, Masonry, PriceSticker } from "@/ui/AdCard";
import { FavButton } from "@/ui/FavButton";
import { Header } from "@/ui/Header";
import { Icon } from "@/ui/icons";
import { Photo, photoUrl } from "@/ui/Photo";
import { changeStatus, removeAd } from "./actions";
import { ContactBar } from "./ContactBar";
import { ReportForm } from "./ReportForm";

export async function generateMetadata(props: PageProps<"/ad/[id]">): Promise<Metadata> {
  const ad = await getAd(await getDb(), (await props.params).id);
  if (!ad) return {};
  const price = formatPrice(ad.ad.price, ad.ad.currency);
  return {
    title: `${ad.ad.title}, ${price}`,
    description: `${price} · ${cityName(ad.ad.city)}. ${ad.ad.description.slice(0, 140)}`,
    openGraph: { images: ad.photos[0] ? [{ url: photoUrl(ad.photos[0].id, 1280), width: 1280 }] : [] },
    robots: ad.ad.status === "active" ? undefined : { index: false },
  };
}

const STATUS: Record<string, string> = {
  pending: "На проверке у модератора — пока его видите только вы",
  rejected: "Отклонено модератором",
  sold: "Продано",
  closed: "Снято с публикации",
  draft: "Черновик",
};

export default async function AdPage(props: PageProps<"/ad/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const db = await getDb();
  const data = await getAd(db, id);
  if (!data) notFound();
  const { ad, seller, photos, category } = data;
  const user = await currentUser();
  const mine = user?.id === ad.userId;
  const admin = isAdmin(user);
  if (ad.status !== "active" && ad.status !== "sold" && !mine && !admin) notFound();
  if (!mine) await countView(db, id);

  const [rating, similarRows, favs] = await Promise.all([
    sellerRating(db, seller.id),
    db
      .select()
      .from(ads)
      .where(and(eq(ads.status, "active"), eq(ads.category, ad.category), eq(ads.city, ad.city), ne(ads.id, ad.id)))
      .orderBy(desc(ads.bumpedAt))
      .limit(12),
    favSet(db, user, [ad.id]),
  ]);
  const simPhotos = await photosFor(db, similarRows.map((a) => a.id));
  const similar = similarRows.map((a) => ({ ...a, photo: simPhotos.get(a.id)?.[0] ?? null, promoted: false }));
  const simFavs = await favSet(db, user, similar.map((a) => a.id));
  const hint = somHint(ad.price, ad.currency);
  const promotedNow = !!ad.promotedUntil && ad.promotedUntil > new Date();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: ad.title,
    description: ad.description,
    image: photos.map((p) => photoUrl(p.id, 1280)),
    offers: ad.price
      ? { "@type": "Offer", price: ad.price, priceCurrency: ad.currency, availability: ad.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock" }
      : undefined,
  };

  return (
    <>
      <div className="hidden md:block">
        <Header signedIn={!!user} />
      </div>
      <main className="mx-auto max-w-[1100px] bg-bg pb-28 md:mt-4 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-10 md:rounded-[28px] md:px-8 md:pt-6 md:pb-10 xl:mx-auto">
        <div>
          <div className="relative">
            {photos.length ? (
              <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:rounded-[12px]" aria-label={`Фото, ${photos.length}`}>
                {photos.map((p, i) => (
                  <div key={p.id} className="w-full shrink-0 snap-center">
                    <Photo photo={p} sizes="(min-width: 768px) 700px, 100vw" priority={i === 0} alt={i === 0 ? ad.title : ""} aspect="4/3" className="max-h-[70vh]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid aspect-[4/3] place-items-center bg-field text-mut md:rounded-[12px]">Без фото</div>
            )}
            <div className="absolute inset-x-3 top-3 flex justify-between md:hidden">
              <Link href="/" aria-label="Назад" className="grid size-11 place-items-center rounded-[12px] bg-bg/90"><Icon name="back" /></Link>
              <FavButton adId={ad.id} on={favs.has(ad.id)} large />
            </div>
            {photos.length > 1 && (
              <span className="num absolute right-3 bottom-8 rounded-[8px] bg-black/60 px-2 py-0.5 text-xs text-white md:bottom-3">
                {photos.length}{NBSP}фото
              </span>
            )}
          </div>

          <section className="relative -mt-5 rounded-t-[22px] bg-bg px-4 pt-5 md:mt-0 md:px-0">
            {ad.status !== "active" && (
              <p className="mb-3 rounded-[10px] bg-field px-3 py-2 text-sm">
                {STATUS[ad.status]}
                {ad.status === "rejected" && ad.rejectReason ? `: ${ad.rejectReason}` : ""}
              </p>
            )}
            <div className="flex items-center gap-3">
              <PriceSticker price={ad.price} currency={ad.currency} big />
              {hint && <span className="text-sm text-mut">{hint}</span>}
              {ad.negotiable && ad.price ? <span className="text-sm text-mut">торг</span> : null}
            </div>
            <h1 className="mt-3 text-[21px] leading-tight font-medium">{ad.title}</h1>
            <p className="mt-1 text-sm text-mut">
              {cityName(ad.city)}
              {ad.district ? `, ${ad.district}` : ""} · {relativeTime(ad.createdAt)} · {count(ad.views, ["просмотр", "просмотра", "просмотров"])}
            </p>

            {category && Object.keys(ad.attrs).length > 0 && (
              <dl className="my-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-line py-4">
                {ad.condition && (
                  <div><dt className="text-xs text-mut">Состояние</dt><dd>{ad.condition === "new" ? "Новое" : "Б/у"}</dd></div>
                )}
                {category.attrs.map((a) => {
                  const v = ad.attrs[a.key];
                  if (v === undefined || v === "" || (a.kind === "bool" && v !== true)) return null;
                  const shown = a.kind === "bool" ? "Да" : a.kind === "number" ? `${typeof v === "number" && v >= 10000 ? formatNumber(v) : String(v).replace(".", ",")}${"unit" in a && a.unit ? `${NBSP}${a.unit}` : ""}` : String(v);
                  return (
                    <div key={a.key}>
                      <dt className="text-xs text-mut">{a.label}</dt>
                      <dd className="num">{shown}</dd>
                    </div>
                  );
                })}
              </dl>
            )}
            {ad.description && <p className="my-4 text-[15px] leading-relaxed whitespace-pre-line">{ad.description}</p>}
            <p className="sr-only">{attrSummary(category, ad.attrs)}</p>
          </section>
        </div>

        <aside className="px-4 md:sticky md:top-24 md:self-start md:px-0">
          <Link href={`/u/${seller.id}`} className="flex items-center gap-3 py-3">
            <span className="grid size-12 place-items-center rounded-full bg-field text-lg font-medium">{(seller.name || "П").slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{seller.name || "Продавец"}</span>
              <span className="block text-sm text-mut">
                {rating.count ? <>★{NBSP}{String(rating.avg).replace(".", ",")} · <span className="link">{count(rating.count, ["отзыв", "отзыва", "отзывов"])}</span> · </> : null}
                {lastSeen(seller.lastSeenAt)}
              </span>
              <span className="block text-xs text-mut">{memberSince(seller.createdAt)}</span>
            </span>
          </Link>

          {mine ? (
            <div className="grid gap-2 py-3">
              <p className="text-sm text-mut">
                {count(ad.views, ["просмотр", "просмотра", "просмотров"])} · телефон показан {count(ad.phoneViews, ["раз", "раза", "раз"])}
                {promotedNow ? ` · в${NBSP}топе до${NBSP}${ad.promotedUntil!.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Bishkek" })}` : ""}
              </p>
              {ad.status === "active" && (
                <Link href={`/promote/${ad.id}`} className="grid h-12 place-items-center rounded-[12px] bg-sun font-medium text-on-sun">
                  {promotedNow ? "Продлить продвижение" : "Продвинуть"}
                </Link>
              )}
              <Link href={`/ad/${ad.id}/edit`} className="grid h-12 place-items-center rounded-[12px] bg-field font-medium">Редактировать</Link>
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm">
                {ad.status === "active" && (
                  <>
                    <form action={changeStatus.bind(null, ad.id, "sold")}><button className="pseudo">Отметить проданным</button></form>
                    <form action={changeStatus.bind(null, ad.id, "closed")}><button className="pseudo">Снять с публикации</button></form>
                  </>
                )}
                {(ad.status === "sold" || ad.status === "closed") && (
                  <form action={changeStatus.bind(null, ad.id, "active")}><button className="pseudo">Опубликовать снова</button></form>
                )}
                <form action={removeAd.bind(null, ad.id)}><button className="pseudo text-danger">Удалить</button></form>
              </div>
            </div>
          ) : ad.status === "active" ? (
            <div className="py-2">
              {typeof sp.error === "string" && <p role="alert" className="mb-2 text-sm text-danger">{sp.error}</p>}
              <ContactBar adId={ad.id} hasPhone={!!seller.phone} />
              <div className="mt-4 flex items-center justify-between">
                <span className="hidden md:inline-flex"><FavButton adId={ad.id} on={favs.has(ad.id)} /></span>
                <ReportForm adId={ad.id} />
              </div>
            </div>
          ) : null}
          <p className="pt-2 text-xs text-mut">Не переводите предоплату. Встречайтесь в людных местах и проверяйте товар до оплаты.</p>
        </aside>

        {similar.length > 0 && (
          <section className="col-span-full px-3 pt-8 md:px-0">
            <h2 className="mb-3 px-1 text-lg font-medium">Похожие {category ? `в «${category.name}»` : ""}</h2>
            <Masonry>
              {similar.map((a) => (
                <AdCard key={a.id} ad={a} fav={simFavs.has(a.id)} />
              ))}
            </Masonry>
          </section>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </main>
    </>
  );
}
