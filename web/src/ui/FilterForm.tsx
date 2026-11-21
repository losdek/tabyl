"use client";
import { useState } from "react";
import { CATEGORIES, categoryBySlug } from "@/domain/categories";
import { CITIES } from "@/domain/places";
import type { Filters } from "@/server/ads";

const field = "h-11 w-full rounded-[10px] bg-field px-3 text-base outline-none focus:outline-2 focus:outline-fg";

/** Plain GET form: shareable URLs, back button works, no JS needed to submit. */
export function FilterForm({ f, action = "/search" }: { f: Filters; action?: string }) {
  const [cat, setCat] = useState(f.category ?? "");
  const category = categoryBySlug(cat);
  return (
    <form
      action={action}
      className="grid gap-4 py-3 md:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        const city = new FormData(e.currentTarget).get("city");
        if (typeof city === "string") document.cookie = `city=${city}; path=/; max-age=31536000; samesite=lax`;
      }}
    >
      {f.q && <input type="hidden" name="q" value={f.q} />}
      <label className="grid gap-1 text-sm">
        <span className="text-mut">Город</span>
        <select name="city" defaultValue={f.city} className={field}>
          <option value="all">Весь Кыргызстан</option>
          {CITIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-mut">Категория</span>
        <select name="cat" value={cat} onChange={(e) => setCat(e.target.value)} className={field}>
          <option value="">Все категории</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>
      <fieldset className="grid gap-1 text-sm">
        <legend className="mb-1 text-mut">Цена</legend>
        <div className="flex gap-2">
          <input name="pmin" inputMode="numeric" placeholder="от" defaultValue={f.priceMin} className={`${field} min-w-0 flex-1`} aria-label="Цена от" />
          <input name="pmax" inputMode="numeric" placeholder="до" defaultValue={f.priceMax} className={`${field} min-w-0 flex-1`} aria-label="Цена до" />
          <select name="cur" defaultValue={f.currency ?? ""} className={`${field} !w-24 shrink-0`} aria-label="Валюта">
            <option value="">сом</option>
            <option value="USD">$</option>
          </select>
        </div>
      </fieldset>
      {(!category || category.condition) && (
        <fieldset className="grid gap-1 text-sm">
          <legend className="mb-1 text-mut">Состояние</legend>
          <div className="flex gap-4">
            {[["", "Любое"], ["new", "Новое"], ["used", "Б/у"]].map(([v, l]) => (
              <label key={v} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="cond" value={v} defaultChecked={(f.condition ?? "") === v} className="size-4 accent-[var(--ink)]" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {category?.attrs
        .filter((a) => a.filter)
        .map((a) =>
          a.kind === "select" ? (
            <label key={a.key} className="grid gap-1 text-sm">
              <span className="text-mut">{a.label}</span>
              <select name={`a_${a.key}`} defaultValue={f.attrs?.[a.key] ?? ""} className={field}>
                <option value="">Любая</option>
                {a.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ) : a.kind === "number" ? (
            <fieldset key={a.key} className="grid gap-1 text-sm">
              <legend className="mb-1 text-mut">{a.label}{"unit" in a && a.unit ? `, ${a.unit}` : ""}</legend>
              <div className="flex gap-2">
                <input name={`a_${a.key}min`} inputMode="numeric" placeholder="от" defaultValue={f.attrs?.[`${a.key}min`]} className={field} aria-label={`${a.label} от`} />
                <input name={`a_${a.key}max`} inputMode="numeric" placeholder="до" defaultValue={f.attrs?.[`${a.key}max`]} className={field} aria-label={`${a.label} до`} />
              </div>
            </fieldset>
          ) : a.kind === "bool" ? (
            <label key={a.key} className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input type="checkbox" name={`a_${a.key}`} value="true" defaultChecked={f.attrs?.[a.key] === "true"} className="size-4 accent-[var(--ink)]" />
              {a.label}
            </label>
          ) : (
            <label key={a.key} className="grid gap-1 text-sm">
              <span className="text-mut">{a.label}</span>
              <input name={`a_${a.key}`} defaultValue={f.attrs?.[a.key] ?? ""} className={field} />
            </label>
          ),
        )}
      <label className="flex min-h-11 items-center gap-2 self-end text-sm">
        <input type="checkbox" name="photo" value="1" defaultChecked={f.withPhoto} className="size-4 accent-[var(--ink)]" />
        Только с фото
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-mut">Сортировка</span>
        <select name="sort" defaultValue={f.sort ?? "new"} className={field}>
          <option value="new">Сначала новые</option>
          <option value="cheap">Сначала дешёвые</option>
          <option value="expensive">Сначала дорогие</option>
        </select>
      </label>
      <div className="flex items-center gap-4 md:col-span-2 lg:col-span-3">
        <button className="h-11 rounded-[12px] bg-ink px-6 font-medium text-on-ink">Показать</button>
        <a href={`${action}${f.q ? `?q=${encodeURIComponent(f.q)}` : ""}`} className="link text-sm text-mut">Сбросить</a>
      </div>
    </form>
  );
}
