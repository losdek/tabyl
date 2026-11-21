import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { listFavorites } from "@/server/ads";
import { requireUser } from "@/server/session";
import { AdCard, Masonry } from "@/ui/AdCard";
import { Header } from "@/ui/Header";

export const metadata: Metadata = { title: "Избранное", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await requireUser("/favorites");
  const list = await listFavorites(await getDb(), user.id);
  const active = list.filter((a) => a.status === "active");
  const gone = list.filter((a) => a.status !== "active");
  return (
    <>
      <Header signedIn />
      <main className="mx-auto max-w-[1280px] px-3 pt-3 md:px-8">
        <h1 className="px-1 pb-3 text-xl font-medium">Избранное</h1>
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
