import { EventEmitter } from "node:events";
import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { adPhotos, ads, blocks, conversations, messages, users } from "@/db/schema";
import { uuid } from "@/lib/ids";

export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;

/* In-process pub/sub for live updates (Postgres LISTEN/NOTIFY when deployed). */
const g = globalThis as unknown as { __tabylBus?: EventEmitter };
export const bus = (g.__tabylBus ??= new EventEmitter().setMaxListeners(1000));

export class ChatError extends Error {}

async function isBlocked(db: DB, a: string, b: string) {
  const rows = await db
    .select({ x: blocks.blockerId })
    .from(blocks)
    .where(or(and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))))
    .limit(1);
  return rows.length > 0;
}

export async function startConversation(db: DB, adId: string, buyerId: string) {
  const [ad] = await db.select().from(ads).where(eq(ads.id, adId)).limit(1);
  if (!ad || ad.status !== "active") throw new ChatError("Объявление недоступно");
  if (ad.userId === buyerId) throw new ChatError("Это ваше объявление");
  if (await isBlocked(db, ad.userId, buyerId)) throw new ChatError("Продавец ограничил переписку");
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.adId, adId), eq(conversations.buyerId, buyerId)))
    .limit(1);
  if (existing) return existing;
  const [c] = await db
    .insert(conversations)
    .values({ id: uuid(), adId, buyerId, sellerId: ad.userId })
    .onConflictDoNothing()
    .returning();
  if (c) return c;
  const [again] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.adId, adId), eq(conversations.buyerId, buyerId)))
    .limit(1);
  return again;
}

export async function conversationFor(db: DB, id: string, userId: string) {
  const [c] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!c || (c.buyerId !== userId && c.sellerId !== userId)) return null;
  return c;
}

export type Outgoing =
  | { kind: "text"; body: string }
  | { kind: "photo"; photoId: string; body?: string }
  | { kind: "place"; address: string; note?: string; lat?: number; lon?: number };

export async function sendMessage(db: DB, conversationId: string, senderId: string, m: Outgoing, now = new Date()) {
  const c = await conversationFor(db, conversationId, senderId);
  if (!c) throw new ChatError("Нет доступа к чату");
  const other = c.buyerId === senderId ? c.sellerId : c.buyerId;
  if (await isBlocked(db, senderId, other)) throw new ChatError("Переписка ограничена");

  let row: typeof messages.$inferInsert;
  if (m.kind === "text") {
    const body = m.body.trim().slice(0, 2000);
    if (!body) throw new ChatError("Пустое сообщение");
    row = { id: uuid(), conversationId, senderId, kind: "text", body, createdAt: now };
  } else if (m.kind === "photo") {
    const [p] = await db.select().from(adPhotos).where(and(eq(adPhotos.id, m.photoId), eq(adPhotos.userId, senderId))).limit(1);
    if (!p) throw new ChatError("Фото не найдено");
    row = {
      id: uuid(), conversationId, senderId, kind: "photo", body: (m.body ?? "").trim().slice(0, 500),
      payload: { photoId: p.id, width: p.width, height: p.height, blur: p.blur }, createdAt: now,
    };
  } else {
    const address = m.address.trim().slice(0, 140);
    if (!address) throw new ChatError("Укажите адрес");
    row = {
      id: uuid(), conversationId, senderId, kind: "place", body: address,
      payload: { address, note: (m.note ?? "").trim().slice(0, 140), lat: m.lat, lon: m.lon }, createdAt: now,
    };
  }
  const [msg] = await db.insert(messages).values(row).returning();
  await db.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversationId));
  bus.emit(`conv:${conversationId}`, { type: "message", message: msg });
  bus.emit(`user:${other}`, { type: "unread" });
  return msg;
}

export async function thread(db: DB, conversationId: string, userId: string) {
  const c = await conversationFor(db, conversationId, userId);
  if (!c) return null;
  const list = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt)).limit(500);
  const otherId = c.buyerId === userId ? c.sellerId : c.buyerId;
  const [other] = await db.select().from(users).where(eq(users.id, otherId)).limit(1);
  const [ad] = await db.select().from(ads).where(eq(ads.id, c.adId)).limit(1);
  const [photo] = await db.select().from(adPhotos).where(eq(adPhotos.adId, c.adId)).orderBy(asc(adPhotos.position)).limit(1);
  const blocked = await isBlocked(db, userId, otherId);
  return { conversation: c, messages: list, other, ad, photo: photo ?? null, blocked };
}

export async function markRead(db: DB, conversationId: string, userId: string, now = new Date()) {
  const res = await db
    .update(messages)
    .set({ readAt: now })
    .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId), isNull(messages.readAt)))
    .returning({ id: messages.id });
  if (res.length) {
    bus.emit(`conv:${conversationId}`, { type: "read", by: userId, at: now.toISOString() });
    bus.emit(`user:${userId}`, { type: "unread" });
  }
}

export async function unreadCount(db: DB, userId: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );
  return n;
}

export async function inbox(db: DB, userId: string) {
  const convs = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.buyerId, userId), eq(conversations.sellerId, userId)))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(200);
  if (!convs.length) return [];
  const ids = convs.map((c) => c.id);
  const others = [...new Set(convs.map((c) => (c.buyerId === userId ? c.sellerId : c.buyerId)))];
  const adIds = [...new Set(convs.map((c) => c.adId))];
  const [people, adRows, photos, lasts, unread] = await Promise.all([
    db.select().from(users).where(inArray(users.id, others)),
    db.select().from(ads).where(inArray(ads.id, adIds)),
    db.select().from(adPhotos).where(and(inArray(adPhotos.adId, adIds), eq(adPhotos.position, 0))),
    db.execute<{ conversation_id: string; body: string; kind: string; sender_id: string; created_at: string }>(sql`
      select distinct on (conversation_id) conversation_id, body, kind, sender_id, created_at
      from messages where conversation_id in ${ids} order by conversation_id, created_at desc`),
    db
      .select({ id: messages.conversationId, n: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(inArray(messages.conversationId, ids), ne(messages.senderId, userId), isNull(messages.readAt)))
      .groupBy(messages.conversationId),
  ]);
  const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const P = byId(people), A = byId(adRows);
  const ph = new Map(photos.map((p) => [p.adId!, p]));
  const L = new Map(lasts.rows.map((r) => [r.conversation_id, r]));
  const U = new Map(unread.map((u) => [u.id, u.n]));
  return convs
    .filter((c) => L.has(c.id))
    .map((c) => ({
      conversation: c,
      other: P.get(c.buyerId === userId ? c.sellerId : c.buyerId)!,
      ad: A.get(c.adId)!,
      photo: ph.get(c.adId) ?? null,
      last: L.get(c.id)!,
      unread: U.get(c.id) ?? 0,
      role: c.sellerId === userId ? ("seller" as const) : ("buyer" as const),
    }));
}

export async function setBlocked(db: DB, userId: string, otherId: string, block: boolean) {
  if (block) await db.insert(blocks).values({ blockerId: userId, blockedId: otherId }).onConflictDoNothing();
  else await db.delete(blocks).where(and(eq(blocks.blockerId, userId), eq(blocks.blockedId, otherId)));
}

/** Both sides wrote at least once — the bar for leaving a review. */
export async function hadRealConversation(db: DB, authorId: string, sellerId: string) {
  const rows = await db.execute<{ id: string }>(sql`
    select c.id from conversations c
    where c.buyer_id = ${authorId} and c.seller_id = ${sellerId}
      and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_id = ${authorId})
      and exists (select 1 from messages m where m.conversation_id = c.id and m.sender_id = ${sellerId})
    limit 1`);
  return rows.rows[0]?.id ?? null;
}

