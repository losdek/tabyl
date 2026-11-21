import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { count, formatPhone, formatPrice, NBSP } from "@/lib/format";
import { myAds } from "@/server/ads";
import { sellerRating } from "@/server/reviews";
import { savedWithNew } from "@/server/saved";
import { requireUser } from "@/server/session";
import { Header } from "@/ui/Header";
import { photoUrl } from "@/ui/Photo";
import { removeSavedSearch } from "./actions";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Профиль", robots: { index: false } };

const STATUS: Record<string, string> = {
  active: "Опубликовано", pending: "На проверке", rejected: "Отклонено", sold: "Продано", closed: "Снято", draft: "Черновик",
};

export default async function ProfilePage(props: PageProps<"/profile">) {
  const user = await requireUser("/profile");
  const sp = await props.searchParams;
  const db = await getDb();
  const [mine, saved, rating] = await Promise.all([myAds(db, user.id), savedWithNew(db, user.id), sellerRating(db, user.id)]);
  const theme = (await cookies()).get("theme")?.value ?? "auto";
  return (
    <>
      <Header signedIn />
      <main className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-4 pb-10">
        <section>
          <h1 className="text-xl font-medium">{user.name || "Профиль"}</h1>
          <p className="mt-1 text-sm text-mut">
            {user.phone ? formatPhone(user.phone) : user.email}
            {rating.count ? <> · ★{NBSP}{String(rating.avg).replace(".", ",")} · <Link href={`/u/${user.id}`} className="link">{count(rating.count, ["отзыв", "отзыва", "отзывов"])}</Link></> : null}
            {" · "}<Link href={`/u/${user.id}`} className="link">как вас видят покупатели</Link>
          </p>
          {sp.deleted === "1" && <p role="status" className="mt-3 text-sm text-ok">Объявление удалено</p>}
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Мои объявления</h2>
            <Link href="/post" className="link text-sm">Подать новое</Link>
          </div>
          {mine.length === 0 ? (
            <p className="py-4 text-sm text-mut">Пока ничего. Первое объявление публикуется за пару минут.</p>
          ) : (
            <ul className="divide-y divide-line">
              {mine.map((a) => (
                <li key={a.id}>
                  <Link href={`/ad/${a.id}`} className="flex items-center gap-3 py-3">
                    {a.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(a.photo.id, 320)} alt="" className="size-16 shrink-0 rounded-[10px] object-cover" />
                    ) : (
                      <span className="size-16 shrink-0 rounded-[10px] bg-field" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{a.title}</span>
                      <span className="num block text-sm font-medium">{formatPrice(a.price, a.currency)}</span>
                      <span className="block text-xs text-mut">
                        <span className={a.status === "rejected" ? "text-danger" : a.status === "active" ? "text-ok" : ""}>{STATUS[a.status]}</span>
                        {a.promoted ? " · в топе" : ""} · {count(a.views, ["просмотр", "просмотра", "просмотров"])}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium">Сохранённые поиски</h2>
          {saved.length === 0 ? (
            <p className="text-sm text-mut">Найдите что-нибудь и нажмите «Сохранить поиск» — новые объявления будут собираться здесь.</p>
          ) : (
            <ul className="divide-y divide-line">
              {saved.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <a href={`/saved/${s.id}`} className="min-w-0 flex-1 truncate">{s.label}</a>
                  {s.fresh > 0 && <span className="num shrink-0 rounded-[6px] bg-sun px-1.5 text-sm text-on-sun">+{s.fresh >= 60 ? "60" : s.fresh} новых</span>}
                  <form action={removeSavedSearch.bind(null, s.id)}>
                    <button className="pseudo shrink-0 text-sm text-mut">удалить</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Настройки</h2>
          <ProfileForm name={user.name} city={user.city} theme={theme} />
        </section>

        <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {user.role === "admin" && <Link href="/admin" className="link">Модерация</Link>}
          <Link href="/rules" className="link">Правила</Link>
          <form action="/auth/logout" method="post"><button className="pseudo text-danger">Выйти</button></form>
        </section>
      </main>
    </>
  );
}
