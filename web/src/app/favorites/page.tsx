import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { listFavorites } from "@/server/ads";
import { currentUser } from "@/server/session";
import { guestFavoriteAds } from "@/server/guest-favs";
import { AdCard, Masonry } from "@/ui/AdCard";
import { Header } from "@/ui/Header";

export const metadata: Metadata = { title: "Избранное", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await currentUser();
  const db = await getDb();
  const list = user ? await listFavorites(db, user.id) : await guestFavoriteAds(db);
  const active = list.filter((a) => a.status === "active");
  const gone = list.filter((a) => a.status !== "active");
  return (
    <>
      <Header signedIn={!!user} />
      <main className="island mx-auto pb-6 max-w-[1280px] px-3 pt-3 md:px-6 md:max-w-[1248px]">
        <h1 className="px-1 pb-3 text-xl font-medium">Избранное</h1>
        {!user && list.length > 0 && (
          <p className="mb-4 px-1 text-sm text-mut">
            Сохранено в этом браузере. <Link href="/login?next=/favorites" className="link text-fg">Войдите</Link>, чтобы избранное было на всех устройствах.
          </p>
        )}
        {list.length === 0 ? (
          <div className="py-12 text-center">
            <p>Нажмите на сердечко у объявления, и оно появится здесь</p>
            <Link href="/" className="link mt-3 inline-block text-sm text-mut">К объявлениям</Link>
          </div>
        ) : (
          <>
            <Masonry>{active.map((a) => <AdCard key={a.id} ad={a} fav />)}</Masonry>
            {gone.length > 0 && (
              <>
                <h2 className="px-1 pt-6 pb-3 text-sm text-mut">Проданы или сняты</h2>
                <div className="opacity-60"><Masonry>{gone.map((a) => <AdCard key={a.id} ad={a} fav />)}</Masonry></div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
