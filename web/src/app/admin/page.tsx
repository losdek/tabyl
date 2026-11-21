import type { Metadata } from "next";
import Link from "next/link";
import { eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ads, messages, users } from "@/db/schema";
import { formatNumber, formatPhone, formatPrice, NBSP, relativeTime } from "@/lib/format";
import { queue, recentAudit } from "@/server/moderation";
import { recentOrders, TIERS, type Tier } from "@/server/promo";
import { requireAdmin } from "@/server/session";
import { Logo } from "@/ui/Logo";
import { approveAction, banAction, deleteMessageAction, dismissAction, refundAction, rejectAction, unbanAction } from "./actions";

export const metadata: Metadata = { title: "Модерация", robots: { index: false } };

const TABS = [["queue", "Очередь"], ["users", "Пользователи"], ["orders", "Оплаты"], ["log", "Журнал"]] as const;
const small = "h-9 rounded-[10px] px-3 text-sm font-medium";

export default async function AdminPage(props: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "queue";
  const db = await getDb();
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-16">
      <header className="mb-4 flex items-center gap-4">
        <Link href="/" aria-label="На главную"><Logo className="h-6 w-auto" /></Link>
        <h1 className="text-lg font-medium">Модерация</h1>
      </header>
      <nav className="mb-6 flex gap-6 border-b border-line text-sm" aria-label="Разделы модерации">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`-mb-px border-b-2 py-2.5 ${tab === k ? "border-fg font-medium" : "border-transparent text-mut"}`}>{l}</Link>
        ))}
      </nav>
      {tab === "queue" && <Queue />}
      {tab === "users" && <Users q={typeof sp.q === "string" ? sp.q : ""} />}
      {tab === "orders" && <Orders />}
      {tab === "log" && <Log />}
    </main>
  );

  async function Queue() {
    const { reports, pending } = await queue(db);
    const adIds = [...new Set([...pending.map((a) => a.id), ...reports.filter((r) => r.targetType === "ad").map((r) => r.targetId)])];
    const adRows = adIds.length ? await db.select().from(ads).where(inArray(ads.id, adIds)) : [];
    const msgIds = reports.filter((r) => r.targetType === "message").map((r) => r.targetId);
    const msgRows = msgIds.length ? await db.select().from(messages).where(inArray(messages.id, msgIds)) : [];
    const A = new Map(adRows.map((a) => [a.id, a]));
    const M = new Map(msgRows.map((m) => [m.id, m]));
    return (
      <div className="grid gap-8">
        <section>
          <h2 className="mb-2 font-medium">На проверке <span className="text-mut">{pending.length}</span></h2>
          {pending.length === 0 && <p className="text-sm text-mut">Пусто</p>}
          <ul className="divide-y divide-line">
            {pending.map((a) => (
              <li key={a.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <Link href={`/ad/${a.id}`} className="link">{a.title}</Link>
                  <p className="text-sm text-mut">{formatPrice(a.price, a.currency)} · {relativeTime(a.updatedAt)} · причины: {reports.filter((r) => r.targetId === a.id).map((r) => r.reason).join(", ") || "—"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={approveAction.bind(null, a.id)}><button className={`${small} bg-ink text-on-ink`}>Одобрить</button></form>
                  <form action={rejectAction.bind(null, a.id)} className="flex gap-2">
                    <input name="reason" placeholder="Причина отказа" className="h-9 w-44 rounded-[10px] bg-field px-2 text-sm" />
                    <button className={`${small} bg-field text-danger`}>Отклонить</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 font-medium">Жалобы <span className="text-mut">{reports.length}</span></h2>
          {reports.length === 0 && <p className="text-sm text-mut">Пусто</p>}
          <ul className="divide-y divide-line">
            {reports.map((r) => {
              const ad = r.targetType === "ad" ? A.get(r.targetId) : undefined;
              const msg = r.targetType === "message" ? M.get(r.targetId) : undefined;
              return (
                <li key={r.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">{r.reason}</span>
                      {r.auto && <span className="ml-2 rounded-[6px] bg-field px-1.5 text-xs">автопроверка</span>}
                      <span className="text-mut"> · {relativeTime(r.createdAt)}</span>
                    </p>
                    {ad && <Link href={`/ad/${ad.id}`} className="link">{ad.title}</Link>}
                    {msg && <p className="text-mut">Сообщение: «{msg.body.slice(0, 140)}»</p>}
                    {r.targetType === "user" && <Link href={`/u/${r.targetId}`} className="link">Профиль пользователя</Link>}
                    {r.note && <p className="text-mut">{r.note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ad && ad.status === "active" && (
                      <form action={rejectAction.bind(null, ad.id)}><input type="hidden" name="reason" value={r.reason} /><button className={`${small} bg-field text-danger`}>Снять объявление</button></form>
                    )}
                    {msg && <form action={deleteMessageAction.bind(null, msg.id)}><button className={`${small} bg-field text-danger`}>Удалить сообщение</button></form>}
                    <form action={dismissAction.bind(null, r.id)}><button className={`${small} bg-field`}>Нарушения нет</button></form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  async function Users({ q }: { q: string }) {
    const digits = q.replace(/\D/g, "");
    const rows = q
      ? await db.select().from(users).where(or(digits.length >= 3 ? ilike(users.phone, `%${digits}%`) : undefined, ilike(users.name, `%${q}%`), eq(users.id, q))).limit(50)
      : [];
    return (
      <section className="grid gap-4">
        <form className="flex gap-2">
          <input type="hidden" name="tab" value="users" />
          <input name="q" defaultValue={q} placeholder="Телефон, имя или id" className="h-11 flex-1 rounded-[12px] bg-field px-3 text-base" />
          <button className="h-11 rounded-[12px] bg-ink px-5 font-medium text-on-ink">Найти</button>
        </form>
        <ul className="divide-y divide-line">
          {rows.map((u) => (
            <li key={u.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="text-sm">
                <Link href={`/u/${u.id}`} className="link font-medium">{u.name || "Без имени"}</Link>
                <p className="text-mut">{u.phone ? formatPhone(u.phone) : u.email} · с {u.createdAt.toLocaleDateString("ru-RU")}{u.bannedAt ? ` · заблокирован: ${u.banReason}` : ""}</p>
              </div>
              {u.bannedAt ? (
                <form action={unbanAction.bind(null, u.id)}><button className={`${small} bg-field`}>Разблокировать</button></form>
              ) : (
                <form action={banAction.bind(null, u.id)} className="flex gap-2">
                  <input name="reason" placeholder="Причина" className="h-9 w-44 rounded-[10px] bg-field px-2 text-sm" />
                  <button className={`${small} bg-field text-danger`}>Заблокировать</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  async function Orders() {
    const list = await recentOrders(db);
    return (
      <table className="w-full text-sm">
        <thead className="text-left text-mut"><tr><th className="py-2 font-normal">Когда</th><th className="font-normal">Что</th><th className="font-normal">Сумма</th><th className="font-normal">Статус</th><th /></tr></thead>
        <tbody className="divide-y divide-line">
          {list.map((o) => (
            <tr key={o.id}>
              <td className="py-2.5">{relativeTime(o.createdAt)}</td>
              <td><Link href={`/ad/${o.adId}`} className="link">{TIERS[o.tier as Tier]?.name ?? o.tier}</Link> <span className="text-mut">{o.provider}</span></td>
              <td className="num">{formatNumber(o.amount)}{NBSP}сом</td>
              <td>{{ created: "создан", pending: "ждёт банк", paid: "оплачен", failed: "не прошёл", refunded: "возврат" }[o.status]}</td>
              <td className="text-right">{o.status === "paid" && <form action={refundAction.bind(null, o.id)}><button className="pseudo text-danger">Вернуть</button></form>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  async function Log() {
    const list = await recentAudit(db);
    return (
      <ul className="divide-y divide-line text-sm">
        {list.map((e) => (
          <li key={e.id} className="py-2.5">
            <span className="text-mut">{relativeTime(e.createdAt)}</span> · {e.action} · {e.targetType} {e.targetId}
            {e.details ? <span className="text-mut"> · {JSON.stringify(e.details)}</span> : null}
          </li>
        ))}
        {list.length === 0 && <li className="py-2.5 text-mut">Пока пусто</li>}
      </ul>
    );
  }
}
