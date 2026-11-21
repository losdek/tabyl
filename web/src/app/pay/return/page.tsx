import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { getOrder, TIERS, type Tier } from "@/server/promo";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Оплата", robots: { index: false } };

export default async function PayReturn(props: PageProps<"/pay/return">) {
  const sp = await props.searchParams;
  const user = await requireUser("/profile");
  const o = typeof sp.order === "string" ? await getOrder(await getDb(), sp.order) : null;
  if (!o || o.userId !== user.id) return <main className="mx-auto max-w-sm px-4 pt-16 text-center">Заказ не найден. <Link className="link" href="/profile">В профиль</Link></main>;
  const tier = TIERS[o.tier as Tier];
  const body =
    o.status === "paid"
      ? { h: "Оплачено", p: tier.days ? `«${tier.name}» включено. Объявление уже в топе.` : "Объявление поднято в ленте." }
      : o.status === "failed" || sp.failed === "1"
        ? { h: "Оплата не прошла", p: "Деньги не списаны. Можно попробовать ещё раз." }
        : { h: "Ждём подтверждение банка", p: "Обычно это занимает до минуты. Обновите страницу чуть позже." };
  return (
    <main className="mx-auto grid max-w-sm gap-3 px-4 pt-16 text-center">
      <h1 className="text-2xl font-medium">{body.h}</h1>
      <p className="text-mut">{body.p}</p>
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <Link href={`/ad/${o.adId}`} className="link">К объявлению</Link>
        {o.status !== "paid" && <Link href={`/promote/${o.adId}`} className="link">Попробовать снова</Link>}
      </div>
    </main>
  );
}
