import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { formatPrice, relativeTime } from "@/lib/format";
import { inbox } from "@/server/chat";
import { requireUser } from "@/server/session";
import { Header } from "@/ui/Header";
import { photoUrl } from "@/ui/Photo";

export const metadata: Metadata = { title: "Чаты", robots: { index: false } };

const preview = (kind: string, body: string) => (kind === "photo" ? "Фото" : kind === "place" ? `Адрес: ${body}` : body);

export default async function ChatsPage() {
  const user = await requireUser("/chats");
  const list = await inbox(await getDb(), user.id);
  return (
    <>
      <Header signedIn />
      <main className="mx-auto max-w-2xl px-3 pt-3">
        <h1 className="px-1 pb-2 text-xl font-medium">Чаты</h1>
        {list.length === 0 ? (
          <div className="px-1 py-12 text-center">
            <p>Здесь будут переписки с продавцами и покупателями</p>
            <Link href="/" className="link mt-3 inline-block text-sm text-mut">Посмотреть объявления</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((c) => (
              <li key={c.conversation.id}>
                <Link href={`/chats/${c.conversation.id}`} className="flex items-center gap-3 px-1 py-3">
                  {c.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(c.photo.id, 320)} alt="" className="size-14 shrink-0 rounded-[10px] object-cover" />
                  ) : (
                    <span className="size-14 shrink-0 rounded-[10px] bg-field" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{c.other.name || (c.role === "seller" ? "Покупатель" : "Продавец")}</span>
                      <span className="shrink-0 text-xs text-mut">{relativeTime(new Date(c.last.created_at))}</span>
                    </span>
                    <span className="block truncate text-sm text-mut">
                      {c.ad.title} · <span className="num">{formatPrice(c.ad.price, c.ad.currency)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? "font-medium text-fg" : "text-mut"}`}>
                        {c.last.sender_id === user.id ? "Вы: " : ""}
                        {preview(c.last.kind, c.last.body)}
                      </span>
                      {c.unread > 0 && <span className="num shrink-0 rounded-full bg-ink px-1.5 text-xs leading-5 text-on-ink">{c.unread}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
