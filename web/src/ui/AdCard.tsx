import Link from "next/link";
import type { CardAd } from "@/server/ads";
import { cityName } from "@/domain/places";
import { formatPrice, relativeTime } from "@/lib/format";
import { FavButton } from "./FavButton";
import { Icon } from "./icons";
import { Photo } from "./Photo";

/** Clamp very tall or very wide photos so the staggered feed keeps a rhythm. */
function aspect(w: number, h: number) {
  const r = Math.min(Math.max(w / h, 0.75), 1.5);
  return `${r}`;
}

export function PriceSticker({ price, currency, big = false }: { price: number | null; currency: "KGS" | "USD"; big?: boolean }) {
  const free = price === 0;
  return (
    <span
      className={`num inline-block rounded-[6px] font-medium ${free ? "bg-ink text-sun" : "bg-sun text-on-sun"} ${
        big ? "px-2.5 py-1 text-2xl font-bold" : "px-2 py-0.5 text-sm"
      }`}
    >
      {formatPrice(price, currency)}
    </span>
  );
}

export function AdCard({ ad, fav, priority = false, now, index = 0, shelf = false }: { ad: CardAd; fav?: boolean; priority?: boolean; now?: Date; index?: number; shelf?: boolean }) {
  const fresh = (now ?? new Date()).getTime() - ad.createdAt.getTime() < 86_400_000;
  return (
    <article className={`card-in ${shelf ? "w-[156px] shrink-0 snap-start md:w-[200px]" : "mb-4 break-inside-avoid"}`} style={{ "--i": index } as React.CSSProperties}>
      <Link href={`/ad/${ad.id}`} className="group block">
        <div className="relative overflow-hidden rounded-[14px]">
          {ad.photo ? (
            <Photo
              photo={ad.photo}
              sizes="(min-width: 1280px) 210px, (min-width: 768px) 25vw, 50vw"
              priority={priority}
              aspect={shelf ? "1" : aspect(ad.photo.width, ad.photo.height)}
              className="transition-transform duration-500 ease-out group-hover:scale-[1.03] group-active:scale-[0.99]"
            />
          ) : (
            <div className="grid aspect-[4/3] place-items-center bg-field text-mut">
              <Icon name="camera" size={28} />
            </div>
          )}
          <span className="absolute bottom-2 left-2">
            <PriceSticker price={ad.price} currency={ad.currency} />
          </span>
          {fresh && !ad.promoted && <span className="absolute top-2 left-2 rounded-full bg-bg/90 px-2 py-0.5 text-[11px] font-medium">Новое</span>}
        </div>
        {ad.promoted && <div className="mt-1.5 text-[11px] text-mut">Реклама</div>}
        <h3 className={`line-clamp-2 text-sm leading-snug font-normal ${ad.promoted ? "mt-0.5" : "mt-2"}`}>{ad.title}</h3>
      </Link>
      <div className="mt-0.5 flex items-center justify-between gap-1 text-xs text-mut">
        <span className="truncate">
          {cityName(ad.city)} · {relativeTime(ad.bumpedAt, now)}
        </span>
        <FavButton adId={ad.id} on={!!fav} />
      </div>
    </article>
  );
}

export function Masonry({ children }: { children: React.ReactNode }) {
  return <div className="columns-2 gap-2.5 md:columns-4 md:gap-4 lg:columns-5 xl:columns-6">{children}</div>;
}
