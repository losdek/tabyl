"use client";
import { useEffect, useRef, useState } from "react";
import { cardFromJSON, type CardJSON } from "@/server/serialize";
import { AdCard, Masonry } from "./AdCard";

/**
 * Server renders the first page; this keeps loading as you scroll.
 * Without JS the «Показать ещё» link still works (real URL with a cursor).
 */
export function Feed({
  initial,
  favs,
  nextCursor,
  query,
}: {
  initial: CardJSON[];
  favs: string[];
  nextCursor: string | null;
  query: string;
}) {
  const [items, setItems] = useState(initial);
  const [fav, setFav] = useState(new Set(favs));
  const [cursor, setCursor] = useState(nextCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const now = new Date();

  async function more() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/ads?${query}${query ? "&" : ""}cursor=${encodeURIComponent(cursor)}`);
      const j: { items: CardJSON[]; nextCursor: string | null; favorites: string[] } = await r.json();
      setItems((xs) => {
        const seen = new Set(xs.map((x) => x.id));
        return [...xs, ...j.items.filter((x) => !seen.has(x.id))];
      });
      setFav((f) => new Set([...f, ...j.favorites]));
      setCursor(j.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && more(), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  });

  return (
    <>
      <Masonry>
        {items.map((a, i) => (
          <AdCard key={a.id} ad={cardFromJSON(a)} fav={fav.has(a.id)} priority={i < 4} now={now} />
        ))}
      </Masonry>
      <div ref={sentinel} className="flex justify-center py-6">
        {cursor && (
          <a
            href={`?${query}${query ? "&" : ""}cursor=${encodeURIComponent(cursor)}`}
            onClick={(e) => {
              e.preventDefault();
              more();
            }}
            className="link text-sm text-mut"
          >
            {loading ? "Загружаем…" : "Показать ещё"}
          </a>
        )}
      </div>
    </>
  );
}
