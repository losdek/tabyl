import { and, desc, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { savedSearches } from "@/db/schema";
import { uuid } from "@/lib/ids";
import { searchAds, type Filters } from "./ads";
import { describeFilters, parseFilters } from "./filters";

export async function saveSearch(db: DB, userId: string, query: string) {
  const q = Object.fromEntries(new URLSearchParams(query));
  const f = parseFilters(q, q.city ?? "bishkek");
  const label = [f.q ? `«${f.q}»` : "", describeFilters(f)].filter(Boolean).join(" · ");
  const existing = await db.select().from(savedSearches).where(eq(savedSearches.userId, userId));
  const dup = existing.find((s) => new URLSearchParams(s.query).toString() === new URLSearchParams(q).toString());
  if (dup) return dup;
  const [row] = await db.insert(savedSearches).values({ id: uuid(), userId, query: q, label }).returning();
  return row;
}

/** Each saved search with the number of matching ads posted since the last visit. */
export async function savedWithNew(db: DB, userId: string) {
  const rows = await db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.createdAt));
  return Promise.all(
    rows.map(async (s) => {
      const f: Filters = parseFilters(s.query, s.query.city ?? "bishkek");
      const fresh = await countNewSince(db, f, s.lastSeenAt);
      return { ...s, fresh };
    }),
  );
}

/** New matches since `since`, counted over the newest 60 (shown as «60+»). */
async function countNewSince(db: DB, f: Filters, since: Date) {
  const page = await searchAds(db, { ...f, sort: "new" }, { limit: 60 });
  return page.items.filter((a) => a.createdAt > since).length;
}

export async function markSearchSeen(db: DB, userId: string, id: string) {
  await db.update(savedSearches).set({ lastSeenAt: new Date() }).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
}

export async function deleteSearch(db: DB, userId: string, id: string) {
  await db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)));
}
