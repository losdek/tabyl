import { and, desc, eq } from "drizzle-orm";
import type { DB } from "@/db/client";
import { ads, orders, promotions } from "@/db/schema";
import { uuid } from "@/lib/ids";

export const TIERS = {
  bump: { name: "Поднять в ленте", note: "Объявление снова окажется среди новых", price: 50, days: 0 },
  top3: { name: "ТОП на 3 дня", note: "Показываем в начале поиска и категории", price: 150, days: 3 },
  top7: { name: "ТОП на 7 дней", note: "То же, на неделю, и поднимаем в ленте", price: 290, days: 7 },
  vip: { name: "VIP на 14 дней", note: "Две недели в топе, лучшее место в ленте", price: 590, days: 14 },
} as const;
export type Tier = keyof typeof TIERS;
export const isTier = (t: string): t is Tier => t in TIERS;

export class PromoError extends Error {}

export async function createOrder(db: DB, userId: string, adId: string, tier: Tier, provider: "freedom" | "stub") {
  const [ad] = await db.select().from(ads).where(eq(ads.id, adId)).limit(1);
  if (!ad || ad.userId !== userId) throw new PromoError("Объявление не найдено");
  if (ad.status !== "active") throw new PromoError("Продвигать можно только опубликованное объявление");
  const [o] = await db
    .insert(orders)
    .values({ id: uuid(), userId, adId, tier, amount: TIERS[tier].price, provider, status: "created" })
    .returning();
  return { order: o, ad };
}

/**
 * Apply a successful payment exactly once (callbacks may repeat).
 * Returns false when the order was already settled.
 */
export async function markPaid(db: DB, orderId: string, providerPaymentId: string | null, raw: Record<string, unknown>, now = new Date()) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) throw new PromoError("Заказ не найден");
  if (o.status === "paid") return false;
  const [updated] = await db
    .update(orders)
    .set({ status: "paid", paidAt: now, providerPaymentId, raw })
    .where(and(eq(orders.id, orderId), eq(orders.status, o.status)))
    .returning();
  if (!updated) return false; // a concurrent callback won
  const tier = TIERS[o.tier as Tier];
  const [ad] = await db.select().from(ads).where(eq(ads.id, o.adId)).limit(1);
  if (!ad) return true;
  if (tier.days === 0) {
    await db.update(ads).set({ bumpedAt: now }).where(eq(ads.id, ad.id));
  } else {
    const from = ad.promotedUntil && ad.promotedUntil > now ? ad.promotedUntil : now;
    const until = new Date(from.getTime() + tier.days * 86_400_000);
    await db.update(ads).set({ promotedUntil: until, bumpedAt: now }).where(eq(ads.id, ad.id));
    await db.insert(promotions).values({ id: uuid(), adId: ad.id, orderId, tier: o.tier, startsAt: now, endsAt: until });
  }
  return true;
}

export async function markFailed(db: DB, orderId: string, raw: Record<string, unknown>) {
  await db.update(orders).set({ status: "failed", raw }).where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
  await db.update(orders).set({ status: "failed", raw }).where(and(eq(orders.id, orderId), eq(orders.status, "created")));
}

export async function setPending(db: DB, orderId: string, providerPaymentId: string) {
  await db.update(orders).set({ status: "pending", providerPaymentId }).where(eq(orders.id, orderId));
}

export async function getOrder(db: DB, id: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return o ?? null;
}

export async function recentOrders(db: DB, limit = 100) {
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}

export async function refundOrder(db: DB, orderId: string) {
  // Freedom Pay refund API call goes here at deploy; locally we only record it
  await db.update(orders).set({ status: "refunded" }).where(and(eq(orders.id, orderId), eq(orders.status, "paid")));
}
