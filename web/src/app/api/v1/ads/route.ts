import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { favoriteIds, mixPromoted, promotedAds, searchAds } from "@/server/ads";
import { parseFilters } from "@/server/filters";
import { cardJSON } from "@/server/serialize";
import { currentUser } from "@/server/session";

/** GET /api/v1/ads — one page of cards for the web feed and the mobile app. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const city = (await cookies()).get("city")?.value ?? "bishkek";
  const f = parseFilters(sp, city);
  const db = await getDb();
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const page = await searchAds(db, f, { cursor, limit: Math.min(Number(sp.limit) || 24, 60) });
  // promoted cards only on the first page
  const items = cursor ? page.items : mixPromoted(page.items, await promotedAds(db, f));
  const user = await currentUser();
  const favs = await favoriteIds(db, user?.id, items.map((a) => a.id));
  return Response.json(
    { items: items.map(cardJSON), nextCursor: page.nextCursor, favorites: [...favs] },
    { headers: { "cache-control": "private, max-age=0" } },
  );
}
