import type { Filters } from "./ads";
import { categoryBySlug } from "@/domain/categories";
import { cityBySlug, isCity } from "@/domain/places";
import { formatNumber, NBSP } from "@/lib/format";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v.replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** URL ⇄ filters. Attribute filters are `a_<key>`, ranges `a_<key>min` / `a_<key>max`. */
export function parseFilters(sp: SP, defaultCity: string): Filters {
  const city = one(sp.city);
  const cat = one(sp.cat);
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const val = one(v);
    if (k.startsWith("a_") && val && /^[a-z]+$/.test(k.slice(2))) attrs[k.slice(2)] = val.slice(0, 60);
  }
  const sort = one(sp.sort);
  const cond = one(sp.cond);
  const cur = one(sp.cur);
  return {
    q: one(sp.q)?.slice(0, 100),
    city: city === "all" || (city && isCity(city)) ? city : defaultCity,
    category: categoryBySlug(cat) ? cat : undefined,
    priceMin: num(one(sp.pmin)),
    priceMax: num(one(sp.pmax)),
    currency: cur === "USD" || cur === "KGS" ? cur : undefined,
    condition: cond === "new" || cond === "used" ? cond : undefined,
    withPhoto: one(sp.photo) === "1",
    attrs,
    sort: sort === "cheap" || sort === "expensive" ? sort : "new",
  };
}

export function filtersToQuery(f: Filters, extra: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.city) p.set("city", f.city);
  if (f.category) p.set("cat", f.category);
  if (f.priceMin !== undefined) p.set("pmin", String(f.priceMin));
  if (f.priceMax !== undefined) p.set("pmax", String(f.priceMax));
  if (f.currency) p.set("cur", f.currency);
  if (f.condition) p.set("cond", f.condition);
  if (f.withPhoto) p.set("photo", "1");
  for (const [k, v] of Object.entries(f.attrs ?? {})) p.set(`a_${k}`, v);
  if (f.sort && f.sort !== "new") p.set("sort", f.sort);
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
}

/** «Бишкек · Электроника · до 100 000 сом · б/у» */
export function describeFilters(f: Filters): string {
  const parts: string[] = [];
  parts.push(f.city === "all" ? "Весь Кыргызстан" : cityBySlug(f.city)?.name ?? "");
  const cat = categoryBySlug(f.category);
  if (cat) parts.push(cat.name);
  const cur = f.currency === "USD" ? "$" : "сом";
  if (f.priceMin !== undefined && f.priceMax !== undefined)
    parts.push(`${formatNumber(f.priceMin)}–${formatNumber(f.priceMax)}${NBSP}${cur}`);
  else if (f.priceMax !== undefined) parts.push(`до${NBSP}${formatNumber(f.priceMax)}${NBSP}${cur}`);
  else if (f.priceMin !== undefined) parts.push(`от${NBSP}${formatNumber(f.priceMin)}${NBSP}${cur}`);
  if (f.condition) parts.push(f.condition === "new" ? "новое" : "б/у");
  if (f.withPhoto) parts.push("с фото");
  for (const [k, v] of Object.entries(f.attrs ?? {})) {
    const m = /^([a-z]+)(min|max)$/.exec(k);
    const a = cat?.attrs.find((x) => x.key === (m ? m[1] : k));
    if (!a) continue;
    if (m) parts.push(`${a.label.toLowerCase()} ${m[2] === "min" ? "от" : "до"}${NBSP}${v}`);
    else parts.push(a.kind === "bool" ? a.label.toLowerCase() : v);
  }
  return parts.filter(Boolean).join(" · ");
}

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.category) n++;
  if (f.priceMin !== undefined || f.priceMax !== undefined) n++;
  if (f.condition) n++;
  if (f.withPhoto) n++;
  n += Object.keys(f.attrs ?? {}).length;
  return n;
}
