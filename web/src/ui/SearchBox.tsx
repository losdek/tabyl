"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Icon } from "./icons";

type Suggest = { categories: { slug: string; name: string }[]; titles: string[] };

/**
 * Search that feels instant:
 *  - suggestions after 2 letters (cached on the server, ~10 ms),
 *  - on search and category pages the results themselves update as you type,
 *    keeping the old results on screen (dimmed) until the new ones arrive.
 */
export function SearchBox({ q = "", live = false, filtersHref, activeFilters = 0 }: { q?: string; live?: boolean; filtersHref?: string; activeFilters?: number }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(q);
  const [sug, setSug] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, start] = useTransition();
  const listId = useId();
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-searching", pending);
  }, [pending]);

  const options = sug ? [...sug.categories.map((c) => ({ kind: "cat" as const, label: c.name, slug: c.slug })), ...sug.titles.map((t) => ({ kind: "q" as const, label: t }))] : [];

  function searchUrl(query: string) {
    const base = live ? path : "/search";
    const p = new URLSearchParams(live ? params.toString() : "");
    p.delete("cursor");
    if (query) p.set("q", query);
    else p.delete("q");
    return `${base}?${p}`;
  }

  function onType(v: string) {
    setValue(v);
    setActive(-1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (live) start(() => router.replace(searchUrl(v.trim()), { scroll: false }));
      abort.current?.abort();
      if (v.trim().length < 2) return setSug(null);
      abort.current = new AbortController();
      try {
        const r = await fetch(`/api/v1/suggest?q=${encodeURIComponent(v.trim())}`, { signal: abort.current.signal });
        setSug(await r.json());
        setOpen(true);
      } catch {}
    }, live ? 140 : 90);
  }

  function go(o?: (typeof options)[number]) {
    setOpen(false);
    if (o?.kind === "cat") return router.push(`/c/${o.slug}`);
    const query = o?.kind === "q" ? o.label : value.trim();
    if (o) setValue(query);
    start(() => (live ? router.replace(searchUrl(query), { scroll: false }) : router.push(searchUrl(query))));
  }

  return (
    <form
      action="/search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(active >= 0 ? options[active] : undefined);
      }}
      className="relative flex h-12 flex-1 items-center gap-2.5 rounded-[12px] bg-field pl-3.5 pr-1 transition-shadow focus-within:shadow-[0_0_0_2px_var(--fg)] md:max-w-[640px]"
    >
      <span className={pending ? "animate-pulse" : ""}><Icon name="search" /></span>
      <input
        name="q"
        value={value}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => sug && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || !options.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? options.length - 1 : a - 1)); }
          else if (e.key === "Escape") setOpen(false);
        }}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Что ищете?"
        aria-label="Поиск по объявлениям"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-mut focus-visible:outline-none"
      />
      {value && (
        <button type="button" aria-label="Очистить" onClick={() => onType("")} className="grid size-9 place-items-center text-mut">
          <Icon name="close" size={18} />
        </button>
      )}
      {filtersHref ? (
        <Link href={filtersHref} className="relative grid size-11 place-items-center" aria-label="Фильтры">
          <Icon name="filter" />
          {activeFilters > 0 && (
            <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-sun text-[10px] font-medium text-on-sun">{activeFilters}</span>
          )}
        </Link>
      ) : null}
      {open && options.length > 0 && (
        <ul id={listId} role="listbox" className="animate-drop absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[12px] border border-line bg-card py-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,.25)]">
          {options.map((o, i) => (
            <li
              key={`${o.kind}-${o.label}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); go(o); }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center gap-3 px-3.5 text-[15px] ${i === active ? "bg-field" : ""}`}
            >
              {o.kind === "cat" ? (
                <><span className="text-mut">в категории</span> {o.label}</>
              ) : (
                <><Icon name="search" size={16} className="text-mut" /><span className="truncate">{o.label}</span></>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
