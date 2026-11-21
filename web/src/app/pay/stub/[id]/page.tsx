import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { formatNumber, NBSP } from "@/lib/format";
import { freedomConfig } from "@/server/payments/freedom";
import { getOrder, markFailed, markPaid, TIERS, type Tier } from "@/server/promo";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Тестовая оплата", robots: { index: false } };

/**
 * Stand-in checkout used only while Freedom Pay keys are absent. It settles the
 * order through the same markPaid/markFailed path the real callback uses.
 */
async function settle(orderId: string, ok: boolean) {
  "use server";
  const user = await requireUser("/");
  const db = await getDb();
  const o = await getOrder(db, orderId);
  if (!o || o.userId !== user.id || o.provider !== "stub" || freedomConfig()) redirect("/");
  if (ok) await markPaid(db, orderId, `stub-${Date.now()}`, { stub: true });
  else await markFailed(db, orderId, { stub: true, result: 0 });
  redirect(`/pay/return?order=${orderId}${ok ? "" : "&failed=1"}`);
}

export default async function StubPay(props: PageProps<"/pay/stub/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/pay/stub/${id}`);
  const o = await getOrder(await getDb(), id);
  if (!o || o.userId !== user.id || o.provider !== "stub") notFound();
  const tier = TIERS[o.tier as Tier];
  return (
    <main className="mx-auto grid max-w-sm gap-4 px-4 pt-10">
      <p className="rounded-[10px] bg-field px-3 py-2 text-sm">Тестовый режим: Freedom Pay ещё не подключён, деньги не списываются.</p>
      <h1 className="text-xl font-medium">{tier?.name}</h1>
      <p className="num text-3xl font-bold">{formatNumber(o.amount)}{NBSP}сом</p>
      {o.status === "created" ? (
        <div className="grid gap-2">
          <form action={settle.bind(null, id, true)}><button className="h-12 w-full rounded-[12px] bg-ink font-medium text-on-ink">Оплатить</button></form>
          <form action={settle.bind(null, id, false)}><button className="pseudo text-sm text-mut">Отказаться от оплаты</button></form>
        </div>
      ) : (
        <p className="text-sm text-mut">Заказ уже обработан.</p>
      )}
    </main>
  );
}
