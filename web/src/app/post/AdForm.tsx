"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CATEGORIES, categoryBySlug } from "@/domain/categories";
import { CITIES } from "@/domain/places";
import type { AdInput } from "@/server/ads";
import { Icon } from "@/ui/icons";
import { photoUrl } from "@/ui/Photo";
import { saveAdAction } from "./actions";

type Ph = { id: string; width: number; height: number; blur: string };
type Up = { key: string; name: string; progress: number; error?: string };
type PriceMode = "price" | "deal" | "free";
export type FormValue = {
  category: string; title: string; description: string; price: string; priceMode: PriceMode; currency: "KGS" | "USD";
  negotiable: boolean; condition: "" | "new" | "used"; city: string; district: string; attrs: Record<string, string | boolean>; photos: Ph[];
};

const DRAFT = "tabyl-draft-v1";
const field = "h-12 w-full rounded-[12px] bg-field px-3.5 text-base outline-none focus:outline-2 focus:outline-fg aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-danger";

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p id={id} role="alert" className="mt-1 text-sm text-danger">{msg}</p> : null;
}

export function AdForm({ adId, initial }: { adId: string | null; initial: FormValue }) {
  const router = useRouter();
  const [v, setV] = useState<FormValue>(initial);
  const [ups, setUps] = useState<Up[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const restored = useRef(false);
  const cat = categoryBySlug(v.category);
  const set = <K extends keyof FormValue>(k: K, val: FormValue[K]) => setV((x) => ({ ...x, [k]: val }));

  // drafts: only for a new ad, saved on every change, restored once
  useEffect(() => {
    if (adId || restored.current) return;
    restored.current = true;
    try {
      const d = localStorage.getItem(DRAFT);
      // one-time restore from browser storage, which does not exist during server render
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (d) setV((x) => ({ ...x, ...JSON.parse(d) }));
    } catch {}
  }, [adId]);
  useEffect(() => {
    if (adId || !restored.current) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify(v));
    } catch {}
  }, [v, adId]);

  function upload(files: FileList | null) {
    if (!files) return;
    const room = 10 - v.photos.length - ups.filter((u) => !u.error).length;
    [...files].slice(0, Math.max(room, 0)).forEach((file) => {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setUps((u) => [...u, { key, name: file.name, progress: 0 }]);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.upload.onprogress = (e) => e.lengthComputable && setUps((u) => u.map((x) => (x.key === key ? { ...x, progress: e.loaded / e.total } : x)));
      xhr.onload = () => {
        const r = JSON.parse(xhr.responseText || "{}");
        if (xhr.status === 200) {
          setV((x) => ({ ...x, photos: [...x.photos, r] }));
          setUps((u) => u.filter((x) => x.key !== key));
        } else setUps((u) => u.map((x) => (x.key === key ? { ...x, error: r.error ?? "Не загрузилось" } : x)));
      };
      xhr.onerror = () => setUps((u) => u.map((x) => (x.key === key ? { ...x, error: "Нет связи" } : x)));
      const fd = new FormData();
      fd.append("file", file);
      xhr.send(fd);
    });
  }

  const move = (i: number, d: -1 | 1) =>
    setV((x) => {
      const p = [...x.photos];
      const j = i + d;
      if (j < 0 || j >= p.length) return x;
      [p[i], p[j]] = [p[j], p[i]];
      return { ...x, photos: p };
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: AdInput = {
      category: v.category,
      title: v.title,
      description: v.description,
      price: v.priceMode === "deal" ? null : v.priceMode === "free" ? 0 : v.price ? Number(v.price.replace(/\s/g, "")) : (NaN as number),
      currency: v.currency,
      negotiable: v.priceMode === "price" && v.negotiable,
      condition: v.condition || null,
      city: v.city,
      district: v.district,
      attrs: v.attrs,
      photoIds: v.photos.map((p) => p.id),
    };
    if (v.priceMode === "price" && !(Number(input.price) >= 0)) {
      setErrors({ price: "Укажите цену или выберите «Договорная»" });
      return;
    }
    start(async () => {
      const r = await saveAdAction(adId, input);
      if (r.ok) {
        try { localStorage.removeItem(DRAFT); } catch {}
        router.push(`/ad/${r.id}?${r.held ? "held=1" : "posted=1"}`);
      } else {
        setErrors(r.errors);
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      }
    });
  }

  const inv = (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `e-${k}` } : {});

  return (
    <form onSubmit={submit} noValidate className="grid gap-6">
      {errors._ && <p role="alert" className="text-danger">{errors._}</p>}

      <section className="grid gap-2">
        <h2 className="text-sm text-mut">Фото <span className="ml-1">{v.photos.length} из 10, первое — обложка</span></h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {v.photos.map((p, i) => (
            <div key={p.id} className="relative overflow-hidden rounded-[10px] bg-field">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p.id, 320)} alt="" className="aspect-square w-full object-cover" style={{ backgroundImage: `url(${p.blur})`, backgroundSize: "cover" }} />
              {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-[6px] bg-sun px-1.5 text-xs text-on-sun">Обложка</span>}
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Сдвинуть левее" className="grid size-8 place-items-center rounded-[8px] bg-bg/90 disabled:opacity-0"><Icon name="back" size={18} /></button>
                <button type="button" onClick={() => set("photos", v.photos.filter((x) => x.id !== p.id))} aria-label="Убрать фото" className="grid size-8 place-items-center rounded-[8px] bg-bg/90"><Icon name="close" size={18} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === v.photos.length - 1} aria-label="Сдвинуть правее" className="grid size-8 place-items-center rounded-[8px] bg-bg/90 disabled:opacity-0"><Icon name="next" size={18} /></button>
              </div>
            </div>
          ))}
          {ups.map((u) => (
            <div key={u.key} className="grid aspect-square place-items-center rounded-[10px] bg-field p-2 text-center text-xs text-mut">
              {u.error ? (
                <span className="text-danger">{u.error} <button type="button" className="pseudo" onClick={() => setUps((x) => x.filter((y) => y.key !== u.key))}>убрать</button></span>
              ) : (
                <span className="w-full">
                  Загружаем…
                  <span className="mt-2 block h-1 overflow-hidden rounded bg-line"><span className="block h-full bg-ink" style={{ width: `${Math.round(u.progress * 100)}%` }} /></span>
                </span>
              )}
            </div>
          ))}
          {v.photos.length + ups.length < 10 && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-[10px] border border-dashed border-mut/50 text-sm text-mut">
              <span className="grid justify-items-center gap-1"><Icon name="camera" size={26} />Добавить</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </section>

      <label className="grid gap-1">
        <span className="text-sm text-mut">Категория</span>
        <select value={v.category} onChange={(e) => setV((x) => ({ ...x, category: e.target.value, attrs: {}, currency: categoryBySlug(e.target.value)?.currency ?? x.currency }))} className={field} {...inv("category")}>
          <option value="">Выберите</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <Err id="e-category" msg={errors.category} />
      </label>

      <label className="grid gap-1">
        <span className="text-sm text-mut">Название</span>
        <input value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={80} placeholder={cat?.slug === "transport" ? "Toyota Camry 70, 2019" : "Что продаёте?"} className={field} {...inv("title")} />
        <Err id="e-title" msg={errors.title} />
      </label>

      {cat && cat.attrs.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          {cat.attrs.map((a) => {
            const k = `attrs.${a.key}`;
            const val = v.attrs[a.key];
            const setA = (x: string | boolean) => setV((s) => ({ ...s, attrs: { ...s.attrs, [a.key]: x } }));
            if (a.kind === "bool")
              return (
                <label key={a.key} className="flex min-h-12 items-center gap-2.5">
                  <input type="checkbox" checked={val === true} onChange={(e) => setA(e.target.checked)} className="size-5 accent-[var(--ink)]" /> {a.label}
                </label>
              );
            return (
              <label key={a.key} className="grid gap-1">
                <span className="text-sm text-mut">{a.label}{"unit" in a && a.unit ? `, ${a.unit}` : ""}{"required" in a && a.required ? "" : " (необязательно)"}</span>
                {a.kind === "select" ? (
                  <select value={String(val ?? "")} onChange={(e) => setA(e.target.value)} className={field} {...inv(k)}>
                    <option value="">Выберите</option>
                    {a.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input value={String(val ?? "")} onChange={(e) => setA(e.target.value)} inputMode={a.kind === "number" ? "decimal" : undefined} placeholder={a.kind === "text" ? a.placeholder : undefined} className={field} {...inv(k)} />
                )}
                <Err id={`e-${k}`} msg={errors[k]} />
              </label>
            );
          })}
        </section>
      )}

      {cat?.condition && (
        <fieldset className="grid gap-1">
          <legend className="mb-1 text-sm text-mut">Состояние</legend>
          <div className="flex gap-5">
            {([["new", "Новое"], ["used", "Б/у"]] as const).map(([val, l]) => (
              <label key={val} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="cond" checked={v.condition === val} onChange={() => set("condition", val)} className="size-5 accent-[var(--ink)]" /> {l}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm text-mut">{cat?.priceLabel ?? "Цена"}</legend>
        <div className="flex flex-wrap gap-x-5">
          {([["price", "Цена"], ["deal", "Договорная"], ["free", "Даром"]] as const).map(([m, l]) => (
            <label key={m} className="flex min-h-11 items-center gap-2">
              <input type="radio" name="pmode" checked={v.priceMode === m} onChange={() => set("priceMode", m)} className="size-5 accent-[var(--ink)]" /> {l}
            </label>
          ))}
        </div>
        {v.priceMode === "price" && (
          <>
            <div className="flex gap-2">
              <input value={v.price} onChange={(e) => set("price", e.target.value.replace(/[^\d\s]/g, ""))} inputMode="numeric" placeholder="0" className={`${field} num min-w-0 flex-1`} aria-label="Сумма" {...inv("price")} />
              <select value={v.currency} onChange={(e) => set("currency", e.target.value as "KGS" | "USD")} className={`${field} !w-28 shrink-0`} aria-label="Валюта">
                <option value="KGS">сом</option>
                <option value="USD">$</option>
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={v.negotiable} onChange={(e) => set("negotiable", e.target.checked)} className="size-5 accent-[var(--ink)]" /> Возможен торг
            </label>
          </>
        )}
        <Err id="e-price" msg={errors.price} />
      </fieldset>

      <label className="grid gap-1">
        <span className="text-sm text-mut">Описание</span>
        <textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={6} maxLength={4000} placeholder="Состояние, комплект, почему продаёте, где можно посмотреть" className="rounded-[12px] bg-field p-3.5 text-base outline-none focus:outline-2 focus:outline-fg" {...inv("description")} />
        <span className="num text-right text-xs text-mut">{v.description.length} / 4000</span>
        <Err id="e-description" msg={errors.description} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm text-mut">Город</span>
          <select value={v.city} onChange={(e) => set("city", e.target.value)} className={field} {...inv("city")}>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-mut">Район или микрорайон (необязательно)</span>
          <input value={v.district} onChange={(e) => set("district", e.target.value)} maxLength={60} placeholder="Джал" className={field} />
        </label>
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg px-4 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] md:static md:mx-0 md:border-0 md:p-0">
        <button disabled={pending || ups.some((u) => !u.error)} className="h-13 w-full rounded-[12px] bg-ink py-3.5 text-base font-medium text-on-ink disabled:opacity-60 md:w-auto md:px-10">
          {pending ? "Сохраняем…" : ups.some((u) => !u.error) ? "Ждём загрузку фото…" : adId ? "Сохранить" : "Опубликовать"}
        </button>
        {Object.keys(errors).length > 0 && !errors._ && <p className="mt-2 text-sm text-danger">Проверьте отмеченные поля</p>}
      </div>
    </form>
  );
}
