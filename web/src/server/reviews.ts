import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { reviews, users } from "@/db/schema";
import { uuid } from "@/lib/ids";
import { hadRealConversation } from "./chat";

export class ReviewError extends Error {}

export async function sellerRating(db: DB, sellerId: string) {
  const [r] = await db
    .select({ avg: sql<number | null>`round(avg(${reviews.rating})::numeric, 1)::float`, n: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.sellerId, sellerId));
  return { avg: r.avg, count: r.n };
}

/** A buyer may review a seller once, and only after a two-way conversation. */
export async function canReview(db: DB, authorId: string, sellerId: string) {
  if (authorId === sellerId) return null;
  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.authorId, authorId), eq(reviews.sellerId, sellerId)))
    .limit(1);
  if (existing) return null;
  return hadRealConversation(db, authorId, sellerId);
}

export async function addReview(db: DB, authorId: string, sellerId: string, rating: number, text: string) {
  const conv = await canReview(db, authorId, sellerId);
  if (!conv) throw new ReviewError("Отзыв можно оставить после переписки с продавцом");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ReviewError("Оценка от 1 до 5");
  await db.insert(reviews).values({ id: uuid(), sellerId, authorId, conversationId: conv, rating, text: text.trim().slice(0, 1000) });
}

export async function replyToReview(db: DB, sellerId: string, reviewId: string, reply: string) {
  const [r] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!r || r.sellerId !== sellerId) throw new ReviewError("Нет доступа");
  if (r.reply) throw new ReviewError("Ответить можно один раз");
  const text = reply.trim().slice(0, 1000);
  if (!text) throw new ReviewError("Пустой ответ");
  await db.update(reviews).set({ reply: text, replyAt: new Date() }).where(eq(reviews.id, reviewId));
}

export async function reviewsFor(db: DB, sellerId: string) {
  return db
    .select({ review: reviews, author: { id: users.id, name: users.name } })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.authorId))
    .where(eq(reviews.sellerId, sellerId))
    .orderBy(desc(reviews.createdAt))
    .limit(100);
}
