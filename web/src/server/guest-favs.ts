import "server-only";
import { cookies } from "next/headers";
import { inArray } from "drizzle-orm";
import type { DB } from "@/db/client";
import { ads, favorites } from "@/db/schema";
import type { User } from "./auth-core";
import { favoriteIds, photosFor, type CardAd } from "./ads";

/**
 * Favourites for visitors who have not signed in live in a cookie
 * (up to 100 ad ids). On sign-in they move into the account.
 */
const COOKIE = "tabyl_fav";
const MAX = 100;

export async function readGuestFavs(): Promise<string[]> {
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  return raw.split(".").filter((x) => /^[a-z0-9]{6,16}$/.test(x)).slice(0, MAX);
}

async function writeGuestFavs(ids: string[]) {
  const jar = await cookies();
  if (!ids.length) jar.delete(COOKIE);
  else jar.set(COOKIE, ids.slice(0, MAX).join("."), { path: "/", maxAge: 365 * 86_400, sameSite: "lax", httpOnly: true });
}

export async function toggleGuestFav(adId: string): Promise<boolean> {
  const ids = await readGuestFavs();
  const on = !ids.includes(adId);
  await writeGuestFavs(on ? [adId, ...ids] : ids.filter((x) => x !== adId));
  return on;
}

/** Which of these ads are favourites for the current visitor, signed in or not. */
export async function favSet(db: DB, user: User | null, adIds: string[]): Promise<Set<string>> {
  if (user) return favoriteIds(db, user.id, adIds);
  const mine = new Set(await readGuestFavs());
  return new Set(adIds.filter((id) => mine.has(id)));
}

export async function guestFavoriteAds(db: DB): Promise<CardAd[]> {
  const ids = await readGuestFavs();
  if (!ids.length) return [];
  const rows = await db.select().from(ads).where(inArray(ads.id, ids));
  const photos = await photosFor(db, rows.map((a) => a.id));
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)
    .map((a) => ({ ...a, photo: photos.get(a.id)?.[0] ?? null, promoted: false }));
}

/** Called right after sign-in: move cookie favourites into the account. */
export async function mergeGuestFavs(db: DB, userId: string) {
  const ids = await readGuestFavs();
  if (!ids.length) return;
  const existing = await db.select({ id: ads.id }).from(ads).where(inArray(ads.id, ids));
  if (existing.length) await db.insert(favorites).values(existing.map((a) => ({ userId, adId: a.id }))).onConflictDoNothing();
  await writeGuestFavs([]);
}
