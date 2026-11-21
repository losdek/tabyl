import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { cityName } from "@/domain/places";
import { formatPrice, lastSeen } from "@/lib/format";
import { thread } from "@/server/chat";
import { canReview } from "@/server/reviews";
import { requireUser } from "@/server/session";
import { Icon } from "@/ui/icons";
import { photoUrl } from "@/ui/Photo";
import { blockAction, reportUserAction } from "../actions";
import { Thread } from "./Thread";

export const metadata: Metadata = { title: "Чат", robots: { index: false } };

export default async function ChatPage(props: PageProps<"/chats/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/chats/${id}`);
  const db = await getDb();
  const t = await thread(db, id, user.id);
  if (!t) notFound();
  const { other, ad, photo, messages, conversation, blocked } = t;
  const reviewable = conversation.buyerId === user.id && (await canReview(db, user.id, other.id));
  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col md:h-[calc(100dvh-0px)] md:border-x md:border-line">
      <header className="flex items-center gap-2.5 px-1 pt-2 pb-2">
        <Link href="/chats" aria-label="Все чаты" className="grid size-11 place-items-center"><Icon name="back" /></Link>
        <Link href={`/u/${other.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-field font-medium">{(other.name || "П").slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-medium">{other.name || (conversation.sellerId === other.id ? "Продавец" : "Покупатель")}</span>
            <span className="block text-xs text-mut">{lastSeen(other.lastSeenAt)}</span>
          </span>
        </Link>
        <details className="relative">
          <summary className="grid size-11 cursor-pointer list-none place-items-center [&::-webkit-details-marker]:hidden" aria-label="Ещё"><Icon name="more" /></summary>
          <div className="absolute right-1 z-10 mt-1 grid w-56 gap-1 rounded-[12px] border border-line bg-card p-2 text-sm shadow-sm">
            {reviewable && <Link href={`/u/${other.id}?review=1`} className="rounded-[8px] px-3 py-2.5 hover:bg-field">Оставить отзыв</Link>}
            <form action={reportUserAction.bind(null, id)}>
              <input type="hidden" name="reason" value="Мошенник" />
              <button className="w-full rounded-[8px] px-3 py-2.5 text-left hover:bg-field">Пожаловаться на мошенника</button>
            </form>
            <form action={blockAction.bind(null, id, !blocked)}>
              <button className="w-full rounded-[8px] px-3 py-2.5 text-left hover:bg-field">{blocked ? "Снять ограничение" : "Ограничить переписку"}</button>
            </form>
          </div>
        </details>
      </header>
      {ad && (
        <Link href={`/ad/${ad.id}`} className="flex items-center gap-2.5 border-y border-line px-4 py-2 text-sm">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(photo.id, 320)} alt="" className="size-8 rounded-[6px] object-cover" />
          ) : (
            <span className="size-8 rounded-[6px] bg-field" />
          )}
          <span className="min-w-0 flex-1 truncate">{ad.title}</span>
          <span className="num font-medium">{formatPrice(ad.price, ad.currency)}</span>
        </Link>
      )}
      <Thread
        id={id}
        me={user.id}
        city={ad ? cityName(ad.city) : ""}
        blocked={blocked}
        initial={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null }))}
      />
    </main>
  );
}
