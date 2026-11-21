import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db/client";
import { adPhotos, ads, favorites, users } from "@/db/schema";
import { categoryBySlug, type Category } from "@/domain/categories";
import { isCity } from "@/domain/places";
import { queryVariants } from "@/domain/synonyms";
import { shortId } from "@/lib/ids";
import { autoCheckAd } from "./moderation";

export type Ad = typeof ads.$inferSelect;
export type Photo = typeof adPhotos.$inferSelect;
export const MAX_PHOTOS = 10;

/* ---------------- validation ---------------- */

export class AdValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Проверьте поля объявления");
  }
}

const base = z.object({
  category: z.string(),
  title: z.string().trim().min(3, "Минимум 3 символа").max(80, "Не больше 80 символов"),
  description: z.string().trim().max(4000, "Не больше 4000 символов").default(""),
  price: z.number().int().min(0).max(10_000_000_000).nullable(),
  currency: z.enum(["KGS", "USD"]),
  negotiable: z.boolean().default(false),
  condition: z.enum(["new", "used"]).nullable().default(null),
  city: z.string().refine(isCity, "Выберите город"),
  district: z.string().trim().max(60).default(""),
  attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  photoIds: z.array(z.string()).max(MAX_PHOTOS, `Не больше ${MAX_PHOTOS} фото`).default([]),
});
export type AdInput = z.input<typeof base>;

function cleanAttrs(cat: Category, raw: Record<string, unknown>, errors: Record<string, string>) {
  const out: Record<string, string | number | boolean> = {};
  for (const a of cat.attrs) {
    const v = raw[a.key];
    const empty = v === undefined || v === null || v === "";
    if (empty) {
      if ("required" in a && a.required) errors[`attrs.${a.key}`] = "Заполните поле";
      continue;
    }
    if (a.kind === "select") {
      if (!a.options.includes(String(v))) errors[`attrs.${a.key}`] = "Выберите из списка";
      else out[a.key] = String(v);
    } else if (a.kind === "number") {
      const n = Number(String(v).replace(",", ".").replace(/\s/g, ""));
      if (!Number.isFinite(n) || (a.min !== undefined && n < a.min) || (a.max !== undefined && n > a.max))
        errors[`attrs.${a.key}`] = "Проверьте число";
      else out[a.key] = n;
    } else if (a.kind === "bool") {
      out[a.key] = v === true || v === "true" || v === "on";
    } else {
      const s = String(v).trim().slice(0, 60);
      if (s) out[a.key] = s;
    }
  }
  return out;
}

export function validateAd(input: AdInput) {
  const errors: Record<string, string> = {};
  const parsed = base.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
  }
  const cat = categoryBySlug(input.category);
  if (!cat) errors.category = "Выберите категорию";
  // collect attribute errors too, so the form shows every problem at once
  const attrs = cat ? cleanAttrs(cat, (input.attrs ?? {}) as Record<string, unknown>, errors) : {};
  if (!parsed.success || !cat) throw new AdValidationError(errors);
  const data = parsed.data;
  if (!cat.condition) data.condition = null;
  if (Object.keys(errors).length) throw new AdValidationError(errors);
  return { ...data, attrs };
}

/* ---------------- writes ---------------- */

async function attachPhotos(db: DB, userId: string, adId: string, photoIds: string[]) {
  if (photoIds.length) {
    const owned = await db
      .select({ id: adPhotos.id })
      .from(adPhotos)
      .where(and(inArray(adPhotos.id, photoIds), eq(adPhotos.userId, userId), or(isNull(adPhotos.adId), eq(adPhotos.adId, adId))));
    const ok = new Set(owned.map((p) => p.id));
    let pos = 0;
    for (const id of photoIds) {
      if (!ok.has(id)) continue;
      await db.update(adPhotos).set({ adId, position: pos++ }).where(eq(adPhotos.id, id));
    }
  }
  // photos removed from the ad are detached (cleaned up by the storage sweep)
  const keep = photoIds.length ? photoIds : ["-"];
  await db
    .update(adPhotos)
    .set({ adId: null })
    .where(and(eq(adPhotos.adId, adId), sql`${adPhotos.id} not in ${keep}`));
}

export async function createAd(db: DB, userId: string, input: AdInput, now = new Date()) {
  const data = validateAd(input);
  const id = shortId();
  await db.insert(ads).values({
    id,
    userId,
    category: data.category,
    title: data.title,
    description: data.description,
    price: data.price,
    currency: data.currency,
    negotiable: data.negotiable,
    condition: data.condition,
    city: data.city,
    district: data.district,
    attrs: data.attrs,
    status: "active",
    createdAt: now,
    updatedAt: now,
    bumpedAt: now,
  });
  await attachPhotos(db, userId, id, data.photoIds);
  const flags = await autoCheckAd(db, id);
  return { id, status: flags.some((f) => f.hold) ? ("pending" as const) : ("active" as const), flags };
}

export async function updateAd(db: DB, userId: string, id: string, input: AdInput, now = new Date()) {
  const [ad] = await db.select().from(ads).where(eq(ads.id, id)).limit(1);
  if (!ad || ad.userId !== userId) throw new Error("not_found");
  const data = validateAd(input);
  await db
    .update(ads)
    .set({
      category: data.category,
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency,
      negotiable: data.negotiable,
      condition: data.condition,
      city: data.city,
      district: data.district,
      attrs: data.attrs,
      updatedAt: now,
      // a rejected ad goes back to the queue after editing
      status: ad.status === "rejected" ? "active" : ad.status,
      rejectReason: null,
    })
    .where(eq(ads.id, id));
  await attachPhotos(db, userId, id, data.photoIds);
  const flags = await autoCheckAd(db, id);
  return { id, flags };
}

export async function setAdStatus(db: DB, userId: string, id: string, status: "active" | "sold" | "closed") {
  const [ad] = await db.select().from(ads).where(eq(ads.id, id)).limit(1);
  if (!ad || ad.userId !== userId) throw new Error("not_found");
  if (ad.status === "rejected" || ad.status === "pending") throw new Error("under_moderation");
  await db.update(ads).set({ status, updatedAt: new Date() }).where(eq(ads.id, id));
}

export async function deleteAd(db: DB, userId: string, id: string) {
  await db.delete(ads).where(and(eq(ads.id, id), eq(ads.userId, userId)));
}

export async function countView(db: DB, id: string, field: "views" | "phoneViews" = "views") {
  const col = field === "views" ? ads.views : ads.phoneViews;
  await db.update(ads).set({ [field]: sql`${col} + 1` }).where(eq(ads.id, id));
}

/* ---------------- reads ---------------- */

export async function photosFor(db: DB, adIds: string[]): Promise<Map<string, Photo[]>> {
  const map = new Map<string, Photo[]>();
  if (!adIds.length) return map;
  const rows = await db.select().from(adPhotos).where(inArray(adPhotos.adId, adIds)).orderBy(asc(adPhotos.position));
  for (const r of rows) {
    const list = map.get(r.adId!) ?? [];
    list.push(r);
    map.set(r.adId!, list);
  }
  return map;
}

export async function getAd(db: DB, id: string) {
  const [row] = await db
    .select({ ad: ads, seller: users })
    .from(ads)
    .innerJoin(users, eq(users.id, ads.userId))
    .where(eq(ads.id, id))
    .limit(1);
  if (!row) return null;
  const photos = (await photosFor(db, [id])).get(id) ?? [];
  return { ...row, photos, category: categoryBySlug(row.ad.category) };
}

export type Filters = {
  q?: string;
  city?: string; // slug or "all"
  category?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: "KGS" | "USD";
  condition?: "new" | "used";
  withPhoto?: boolean;
  attrs?: Record<string, string>;
  sort?: "new" | "cheap" | "expensive";
  userId?: string;
};

export type CardAd = Ad & { photo: Photo | null; promoted: boolean };

function where(f: Filters, now: Date): SQL[] {
  const w: SQL[] = [eq(ads.status, "active")];
  if (f.userId) w.push(eq(ads.userId, f.userId));
  if (f.city && f.city !== "all") w.push(eq(ads.city, f.city));
  if (f.category) w.push(eq(ads.category, f.category));
  if (f.currency) w.push(eq(ads.currency, f.currency));
  if (f.priceMin !== undefined) w.push(sql`${ads.price} >= ${f.priceMin}`);
  if (f.priceMax !== undefined) w.push(sql`${ads.price} <= ${f.priceMax}`);
  if (f.condition) w.push(eq(ads.condition, f.condition));
  if (f.withPhoto) w.push(sql`exists (select 1 from ad_photos p where p.ad_id = ${ads.id})`);
  for (const [k, v] of Object.entries(f.attrs ?? {})) {
    if (!/^[a-z]+$/.test(k) || v === "") continue;
    if (k.endsWith("min") || k.endsWith("max")) continue;
    w.push(sql`${ads.attrs}->>${k} = ${v}`);
  }
  for (const [k, v] of Object.entries(f.attrs ?? {})) {
    const m = /^([a-z]+)(min|max)$/.exec(k);
    const n = Number(v);
    if (!m || !Number.isFinite(n)) continue;
    w.push(m[2] === "min" ? sql`(${ads.attrs}->>${m[1]})::numeric >= ${n}` : sql`(${ads.attrs}->>${m[1]})::numeric <= ${n}`);
  }
  const q = f.q?.trim();
  if (q) {
    const any = queryVariants(q).map(
      (v) => sql`(${ads.search} @@ websearch_to_tsquery('russian', ${v}) or ${ads.search} @@ websearch_to_tsquery('simple', ${v}) or word_similarity(${v}, ${ads.title}) > 0.45)`,
    );
    w.push(sql`(${sql.join(any, sql` or `)})`);
  }
  void now;
  return w;
}

/**
 * One page of results. New-first uses a keyset cursor (stable under inserts);
 * price sorts and relevance use an offset cursor.
 */
export async function searchAds(db: DB, f: Filters, opts: { cursor?: string; limit?: number; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const limit = Math.min(opts.limit ?? 24, 60);
  const w = where(f, now);
  const q = f.q?.trim();
  const sort = f.sort ?? "new";
  // plain browsing pages by a keyset cursor (stable while new ads arrive);
  // search and price sorts page by offset
  const useOffset = sort !== "new" || !!q;
  let order: SQL[];
  if (sort === "cheap") order = [sql`${ads.price} asc nulls last`, desc(ads.bumpedAt), desc(ads.id)];
  else if (sort === "expensive") order = [sql`${ads.price} desc nulls last`, desc(ads.bumpedAt), desc(ads.id)];
  else if (q) order = [sql`(${sql.join(queryVariants(q).map((v) => sql`${ads.search} @@ websearch_to_tsquery('russian', ${v})`), sql` or `)}) desc`, desc(ads.bumpedAt), desc(ads.id)];
  else order = [desc(ads.bumpedAt), desc(ads.id)];
  let offset = 0;
  if (opts.cursor && useOffset) offset = Number(opts.cursor.replace(/^o/, "")) || 0;
  if (opts.cursor && !useOffset) {
    const [t, id] = opts.cursor.split("_");
    const at = new Date(Number(t));
    if (!Number.isNaN(at.getTime()) && id) w.push(or(lt(ads.bumpedAt, at), and(eq(ads.bumpedAt, at), lt(ads.id, id)))!);
  }
  const rows = await db
    .select()
    .from(ads)
    .where(and(...w))
    .orderBy(...order)
    .limit(limit + 1)
    .offset(offset);
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const photos = await photosFor(db, page.map((a) => a.id));
  const items: CardAd[] = page.map((a) => ({ ...a, photo: photos.get(a.id)?.[0] ?? null, promoted: false }));
  const lastRow = page[page.length - 1];
  const nextCursor = !more ? null : useOffset ? `o${offset + limit}` : `${lastRow.bumpedAt.getTime()}_${lastRow.id}`;
  return { items, nextCursor };
}

export async function countAds(db: DB, f: Filters, now = new Date()) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(ads).where(and(...where(f, now)));
  return n;
}

export async function countNewToday(db: DB, city: string | undefined, now = new Date()) {
  const start = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Bishkek" }) + "T00:00:00+06:00");
  const w: SQL[] = [eq(ads.status, "active"), gt(ads.createdAt, start)];
  if (city && city !== "all") w.push(eq(ads.city, city));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(ads).where(and(...w));
  return n;
}

/** Promoted ads matching the filters, rotated randomly; shown in fixed slots. */
export async function promotedAds(db: DB, f: Filters, n = 2, now = new Date()): Promise<CardAd[]> {
  const rows = await db
    .select()
    .from(ads)
    .where(and(...where(f, now), gt(ads.promotedUntil, now)))
    .orderBy(sql`random()`)
    .limit(n);
  const photos = await photosFor(db, rows.map((a) => a.id));
  return rows.map((a) => ({ ...a, photo: photos.get(a.id)?.[0] ?? null, promoted: true }));
}

/** Put promoted cards at positions 2 and 9; a promoted ad leaves its organic spot. */
export function mixPromoted(items: CardAd[], promoted: CardAd[]): CardAd[] {
  const ids = new Set(promoted.map((p) => p.id));
  const out = items.filter((i) => !ids.has(i.id));
  const slots = [2, 9];
  promoted.forEach((p, i) => {
    out.splice(Math.min(slots[i] ?? out.length, out.length), 0, p);
  });
  return out;
}

export async function myAds(db: DB, userId: string) {
  const rows = await db.select().from(ads).where(eq(ads.userId, userId)).orderBy(desc(ads.updatedAt));
  const photos = await photosFor(db, rows.map((a) => a.id));
  return rows.map((a) => ({ ...a, photo: photos.get(a.id)?.[0] ?? null, promoted: !!a.promotedUntil && a.promotedUntil > new Date() }));
}

export async function favoriteIds(db: DB, userId: string | undefined, adIds: string[]) {
  if (!userId || !adIds.length) return new Set<string>();
  const rows = await db
    .select({ adId: favorites.adId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), inArray(favorites.adId, adIds)));
  return new Set(rows.map((r) => r.adId));
}

export async function toggleFavorite(db: DB, userId: string, adId: string) {
  const del = await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.adId, adId)))
    .returning();
  if (del.length) return false;
  await db.insert(favorites).values({ userId, adId }).onConflictDoNothing();
  return true;
}

export async function listFavorites(db: DB, userId: string) {
  const rows = await db
    .select({ ad: ads })
    .from(favorites)
    .innerJoin(ads, eq(ads.id, favorites.adId))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
  const photos = await photosFor(db, rows.map((r) => r.ad.id));
  return rows.map(({ ad }) => ({ ...ad, photo: photos.get(ad.id)?.[0] ?? null, promoted: false }));
}

/** Title suggestions for the search box. */
export async function suggest(db: DB, q: string, limit = 6) {
  const s = q.trim();
  if (s.length < 2) return [];
  const rows = await db.execute<{ title: string }>(sql`
    select distinct on (lower(title)) title, word_similarity(${s}, title) as sim
    from ads where status = 'active' and (title ilike ${"%" + s + "%"} or word_similarity(${s}, title) > 0.4)
    order by lower(title), sim desc limit 40`);
  return rows.rows
    .sort((a, b) => Number((b as { sim?: number }).sim ?? 0) - Number((a as { sim?: number }).sim ?? 0))
    .slice(0, limit)
    .map((r) => r.title);
}
