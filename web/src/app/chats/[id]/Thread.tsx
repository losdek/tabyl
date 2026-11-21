"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { clockTime, NBSP } from "@/lib/format";
import { Icon } from "@/ui/icons";
import { photoUrl } from "@/ui/Photo";
import { readAction, sendAction } from "../actions";

export type Msg = {
  id: string;
  senderId: string;
  kind: "text" | "photo" | "place";
  body: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
};

const twoGis = (address: string, city: string) => `https://2gis.kg/search/${encodeURIComponent(`${city} ${address}`)}`;
const dayLabel = (d: Date) => {
  const k = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "Asia/Bishkek" });
  const now = new Date();
  if (k(d) === k(now)) return "Сегодня";
  if (k(d) === k(new Date(now.getTime() - 86_400_000))) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Bishkek" });
};

/** Consecutive messages from one sender within 5 minutes form a group with one time stamp. */
function groups(list: Msg[]) {
  const out: { day?: string; me: boolean; senderId: string; items: Msg[] }[] = [];
  let lastDay = "";
  for (const m of list) {
    const d = new Date(m.createdAt);
    const day = dayLabel(d);
    const prev = out[out.length - 1];
    const join = prev && prev.senderId === m.senderId && day === lastDay &&
      d.getTime() - new Date(prev.items[prev.items.length - 1].createdAt).getTime() < 5 * 60_000;
    if (join) prev.items.push(m);
    else out.push({ day: day !== lastDay ? day : undefined, me: false, senderId: m.senderId, items: [m] });
    lastDay = day;
  }
  return out;
}

export function Thread({ id, me, initial, city, blocked }: { id: string; me: string; initial: Msg[]; city: string; blocked: boolean }) {
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  // only messages that arrive while the chat is open animate in
  const [seen] = useState(() => new Set(initial.map((m) => m.id)));

  useEffect(() => {
    readAction(id);
    const es = new EventSource(`/api/chat/${id}/stream`);
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.type === "message") {
        const m: Msg = { ...ev.message, createdAt: ev.message.createdAt, readAt: ev.message.readAt };
        setList((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m]));
        if (m.senderId !== me) readAction(id);
      } else if (ev.type === "read" && ev.by !== me) {
        setList((xs) => xs.map((x) => (x.senderId === me && !x.readAt ? { ...x, readAt: ev.at } : x)));
      }
    };
    return () => es.close();
  }, [id, me]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  const send = (m: Parameters<typeof sendAction>[1], after?: () => void) =>
    start(async () => {
      setError("");
      const r = await sendAction(id, m);
      if (!r.ok) setError(r.error);
      else after?.();
    });

  async function sendPhoto(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json();
    if (!r.ok) setError(j.error ?? "Фото не загрузилось");
    else send({ kind: "photo", photoId: j.id });
  }

  const lastMine = [...list].reverse().find((m) => m.senderId === me);

  return (
    <>
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-3 py-4" aria-live="polite">
        <p className="mx-auto max-w-[30ch] text-center text-xs leading-snug text-mut">
          Мы никогда не{NBSP}просим предоплату и{NBSP}не{NBSP}присылаем ссылки на{NBSP}оплату
        </p>
        {groups(list).map((g, gi) => {
          const mine = g.senderId === me;
          const last = g.items[g.items.length - 1];
          return (
            <div key={gi} className="contents">
              {g.day && <p className="text-center text-xs text-mut">{g.day}</p>}
              <div className={`flex max-w-[82%] flex-col gap-[3px] ${mine ? "items-end self-end" : "items-start"}`}>
                {g.items.map((m, i) => {
                  const first = i === 0, lastIn = i === g.items.length - 1;
                  const r = mine
                    ? `rounded-l-[18px] ${first ? "rounded-tr-[18px]" : "rounded-tr-[6px]"} ${lastIn ? "rounded-br-[18px]" : "rounded-br-[6px]"}`
                    : `rounded-r-[18px] ${first ? "rounded-tl-[18px]" : "rounded-tl-[6px]"} ${lastIn ? "rounded-bl-[18px]" : "rounded-bl-[6px]"}`;
                  const bg = mine ? "bg-mine" : "bg-field";
                  if (m.kind === "photo") {
                    const p = m.payload as { photoId: string; width: number; height: number; blur: string };
                    return (
                      <a key={m.id} href={photoUrl(p.photoId, 1280)} target="_blank" className={`${seen.has(m.id) ? "" : "bubble-in"} block w-[220px] overflow-hidden ${r}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl(p.photoId, 640)} alt="Фото в чате" width={p.width} height={p.height} className="aspect-[4/3] w-full object-cover" style={{ backgroundImage: `url(${p.blur})`, backgroundSize: "cover" }} />
                      </a>
                    );
                  }
                  if (m.kind === "place") {
                    const p = m.payload as { address: string; note?: string };
                    return (
                      <div key={m.id} className={`${seen.has(m.id) ? "" : "bubble-in"} ${bg} ${r} grid w-[230px] gap-0.5 px-3 py-2.5`}>
                        <span className="flex items-center gap-1.5 font-medium"><Icon name="pin" size={16} />{p.address}</span>
                        {p.note && <span className="text-sm text-mut">{p.note}</span>}
                        <a href={twoGis(p.address, city)} target="_blank" rel="noopener" className="link mt-1.5 text-sm">Открыть в 2ГИС</a>
                      </div>
                    );
                  }
                  return (
                    <p key={m.id} className={`${seen.has(m.id) ? "" : "bubble-in"} ${bg} ${r} px-3 py-2 text-[15px] leading-snug break-words whitespace-pre-wrap`}>{m.body}</p>
                  );
                })}
                <span className="px-1 pt-0.5 text-[11px] text-mut">
                  {clockTime(new Date(last.createdAt))}
                  {mine && lastMine?.id === last.id ? (last.readAt ? " · прочитано" : " · отправлено") : ""}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {blocked ? (
        <p className="border-t border-line px-4 py-4 text-center text-sm text-mut">Вы ограничили переписку с этим человеком</p>
      ) : (
        <div className="border-t border-line bg-bg px-2.5 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
          {error && <p role="alert" className="px-2 pb-1.5 text-sm text-danger">{error}</p>}
          {placeOpen && (
            <form
              className="grid gap-2 px-1 pb-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                send({ kind: "place", address: String(f.get("address")), note: String(f.get("note") ?? "") }, () => setPlaceOpen(false));
              }}
            >
              <input name="address" required maxLength={140} placeholder="Адрес встречи, например ул. Ахунбаева, 98" className="h-11 rounded-[12px] bg-field px-3 text-base outline-none" />
              <input name="note" maxLength={140} placeholder="Ориентир (необязательно)" className="h-11 rounded-[12px] bg-field px-3 text-base outline-none" />
              <div className="flex gap-4">
                <button className="h-10 rounded-[12px] bg-ink px-4 text-sm font-medium text-on-ink">Отправить адрес</button>
                <button type="button" className="pseudo text-sm" onClick={() => setPlaceOpen(false)}>Отмена</button>
              </div>
            </form>
          )}
          <form
            className="flex items-end gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send({ kind: "text", body: text }, () => setText(""));
            }}
          >
            <label className="grid size-11 shrink-0 cursor-pointer place-items-center" aria-label="Отправить фото">
              <Icon name="clip" />
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { sendPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <button type="button" aria-label="Отправить адрес встречи" onClick={() => setPlaceOpen((x) => !x)} className="grid size-11 shrink-0 place-items-center">
              <Icon name="pin" />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Сообщение"
              aria-label="Сообщение"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-[14px] bg-field px-3.5 py-2.5 text-base outline-none"
            />
            <button disabled={pending || !text.trim()} aria-label="Отправить" className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-sun text-on-sun disabled:opacity-50">
              <Icon name="send" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
