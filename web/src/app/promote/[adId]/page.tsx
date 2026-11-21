import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { formatNumber, NBSP } from "@/lib/format";
import { getAd } from "@/server/ads";
import { freedomConfig } from "@/server/payments/freedom";
import { TIERS } from "@/server/promo";
import { requireUser } from "@/server/session";
import { Icon } from "@/ui/icons";
import { payAction } from "./actions";

export const metadata: Metadata = { title: "Продвижение", robots: { index: false } };

export default async function PromotePage(props: PageProps<"/promote/[adId]">) {
  const { adId } = await props.params;
  const sp = await props.searchParams;
  const user = await requireUser(`/promote/${adId}`);
  const data = await getAd(await getDb(), adId);
  if (!data || data.ad.userId !== user.id) notFound();
  const { ad } = data;
  const until = ad.promotedUntil && ad.promotedUntil > new Date() ? ad.promotedUntil : null;
  return (
    <main className="mx-auto max-w-xl px-4 pt-3 pb-12">
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/ad/${adId}`} aria-label="Назад" className="-ml-2 grid size-11 place-items-center"><Icon name="back" /></Link>
        <h1 className="text-xl font-medium">Продвижение</h1>
      </div>
      <p className="mb-1 truncate">{ad.title}</p>
      <p className="mb-6 text-sm text-mut">
        {until ? `Сейчас в топе до ${until.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Bishkek" })} — новое продвижение добавится к этому сроку.` : "Продвинутые объявления показываются в двух местах в начале ленты и поиска с пометкой «Реклама»."}
      </p>
      {typeof sp.error === "string" && <p role="alert" className="mb-4 text-sm text-danger">{sp.error}</p>}
      <form action={payAction.bind(null, adId)} className="grid gap-3">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Вариант</legend>
          {Object.entries(TIERS).map(([key, t], i) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-line p-4 has-[:checked]:border-fg has-[:checked]:bg-field">
              <input type="radio" name="tier" value={key} defaultChecked={i === 1} className="size-5 accent-[var(--ink)]" />
              <span className="flex-1">
                <span className="block font-medium">{t.name}</span>
                <span className="block text-sm text-mut">{t.note}</span>
              </span>
              <span className="num shrink-0 rounded-[6px] bg-sun px-2 py-0.5 font-medium text-on-sun">{formatNumber(t.price)}{NBSP}сом</span>
            </label>
          ))}
        </fieldset>
        <button className="mt-2 h-12 rounded-[12px] bg-ink font-medium text-on-ink">Перейти к оплате</button>
        <p className="text-xs text-mut">
          {freedomConfig() ? "Оплата картой Элкарт, Visa или Mastercard через Freedom Pay." : "Платёжная система не подключена — откроется тестовая оплата, деньги не списываются."}
        </p>
      </form>
    </main>
  );
}
