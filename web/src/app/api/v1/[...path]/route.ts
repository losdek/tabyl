/**
 * Tabyl JSON API v1 — used by the Android app (and the web feed's «load more»).
 * Same server functions as the website; auth is `Authorization: Bearer <token>`.
 * Reference: docs/api.md.
 */
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb, type DB } from "@/db/client";
import { users } from "@/db/schema";
import { CATEGORIES } from "@/domain/categories";
import { CITIES, isCity } from "@/domain/places";
import {
  AdValidationError, countView, createAd, favoriteIds, getAd, listFavorites, mixPromoted, myAds, promotedAds, searchAds,
  setAdStatus, toggleFavorite, updateAd, type AdInput,
} from "@/server/ads";
import { AuthError, endSession, requestCode, verifyCode, type User } from "@/server/auth-core";
import { ChatError, inbox, markRead, sendMessage, startConversation, thread, unreadCount } from "@/server/chat";
import { parseFilters } from "@/server/filters";
import { report } from "@/server/moderation";
import { createOrder, getOrder, markFailed, markPaid, PromoError, TIERS, isTier } from "@/server/promo";
import { addReview, canReview, reviewsFor, ReviewError, sellerRating } from "@/server/reviews";
import { cardJSON } from "@/server/serialize";
import { currentUser } from "@/server/session";
import { freedomConfig, initPayment } from "@/server/payments/freedom";

type Ctx = { req: Request; db: DB; user: User | null; params: string[]; body: Record<string, unknown> };
type Handler = (c: Ctx) => Promise<Response>;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "private, no-store" } });
const fail = (status: number, error: string, fields?: Record<string, string>) => json({ error, fields }, status);
const need = (c: Ctx) => {
  if (!c.user) throw new HttpError(401, "Войдите в аккаунт");
  return c.user;
};
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const publicUser = (u: User) => ({ id: u.id, name: u.name, city: u.city, createdAt: u.createdAt.toISOString(), lastSeenAt: u.lastSeenAt.toISOString() });
const me = (u: User) => ({ ...publicUser(u), phone: u.phone, email: u.email, role: u.role });

/* ---------- routes: [method, pattern, handler]; `:x` captures a segment ---------- */
const routes: [string, string, Handler][] = [
  ["GET", "meta", async () =>
    json({ categories: CATEGORIES, cities: CITIES, tiers: TIERS, payments: freedomConfig() ? "freedom" : "test" })],

  ["POST", "auth/code", async ({ db, body }) => {
    await requestCode(db, String(body.phone ?? ""));
    return json({ ok: true });
  }],
  ["POST", "auth/verify", async ({ db, body }) => {
    const s = await verifyCode(db, String(body.phone ?? ""), String(body.code ?? ""), "app");
    const [u] = await db.select().from(users).where(eq(users.id, s.userId));
    return json({ token: s.token, expiresAt: s.expiresAt.toISOString(), user: me(u) });
  }],
  ["POST", "auth/logout", async ({ db, req }) => {
    const t = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (t) await endSession(db, t);
    return json({ ok: true });
  }],

  ["GET", "me", async (c) => {
    const u = need(c);
    return json({ user: me(u), unread: await unreadCount(c.db, u.id), rating: await sellerRating(c.db, u.id) });
  }],
  ["PATCH", "me", async (c) => {
    const u = need(c);
    const name = String(c.body.name ?? u.name).trim().slice(0, 40);
    const city = String(c.body.city ?? u.city);
    if (!name) return fail(422, "Укажите имя", { name: "Укажите имя" });
    if (!isCity(city)) return fail(422, "Выберите город", { city: "Выберите город" });
    const [nu] = await c.db.update(users).set({ name, city }).where(eq(users.id, u.id)).returning();
    return json({ user: me(nu) });
  }],
  ["GET", "me/ads", async (c) => json({ items: (await myAds(c.db, need(c).id)).map(cardJSON) })],

  ["GET", "ads", async ({ req, db, user }) => {
    const url = new URL(req.url);
    const city = (await cookies()).get("city")?.value ?? user?.city ?? "bishkek";
    const f = parseFilters(Object.fromEntries(url.searchParams), city);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const page = await searchAds(db, f, { cursor, limit: Math.min(Number(url.searchParams.get("limit")) || 24, 60) });
    const items = cursor ? page.items : mixPromoted(page.items, await promotedAds(db, f));
    const favs = await favoriteIds(db, user?.id, items.map((a) => a.id));
    return json({ items: items.map(cardJSON), nextCursor: page.nextCursor, favorites: [...favs] });
  }],
  ["POST", "ads", async (c) => {
    const r = await createAd(c.db, need(c).id, c.body as unknown as AdInput);
    return json({ id: r.id, status: r.status }, 201);
  }],
  ["GET", "ads/:id", async ({ db, user, params: [id] }) => {
    const d = await getAd(db, id);
    if (!d) return fail(404, "Объявление не найдено");
    const mine = user?.id === d.ad.userId;
    if (d.ad.status !== "active" && d.ad.status !== "sold" && !mine) return fail(404, "Объявление не найдено");
    if (!mine) await countView(db, id);
    const fav = (await favoriteIds(db, user?.id, [id])).has(id);
    const { search: _s, ...ad } = d.ad;
    void _s;
    return json({
      ad: { ...ad, createdAt: ad.createdAt.toISOString(), updatedAt: ad.updatedAt.toISOString(), bumpedAt: ad.bumpedAt.toISOString(), promotedUntil: ad.promotedUntil?.toISOString() ?? null },
      photos: d.photos.map((p) => ({ id: p.id, width: p.width, height: p.height, blur: p.blur })),
      seller: { ...publicUser(d.seller), hasPhone: !!d.seller.phone, rating: await sellerRating(db, d.seller.id) },
      favorite: fav,
      mine,
    });
  }],
  ["PUT", "ads/:id", async (c) => {
    await updateAd(c.db, need(c).id, c.params[0], c.body as unknown as AdInput);
    return json({ ok: true });
  }],
  ["POST", "ads/:id/status", async (c) => {
    const s = String(c.body.status);
    if (s !== "active" && s !== "sold" && s !== "closed") return fail(422, "Неверный статус");
    await setAdStatus(c.db, need(c).id, c.params[0], s);
    return json({ ok: true });
  }],
  ["POST", "ads/:id/favorite", async (c) => json({ on: await toggleFavorite(c.db, need(c).id, c.params[0]) })],
  ["POST", "ads/:id/phone", async (c) => {
    need(c);
    const d = await getAd(c.db, c.params[0]);
    if (!d?.seller.phone) return fail(404, "Телефон скрыт");
    await countView(c.db, c.params[0], "phoneViews");
    return json({ phone: d.seller.phone });
  }],
  ["POST", "ads/:id/chat", async (c) => json({ conversationId: (await startConversation(c.db, c.params[0], need(c).id)).id })],
  ["POST", "ads/:id/promote", async (c) => {
    const u = need(c);
    const tier = String(c.body.tier);
    if (!isTier(tier)) return fail(422, "Выберите вариант");
    const provider = freedomConfig() ? "freedom" : "stub";
    const { order, ad } = await createOrder(c.db, u.id, c.params[0], tier, provider);
    if (provider === "stub") return json({ orderId: order.id, provider, amount: order.amount });
    const origin = process.env.TABYL_ORIGIN ?? new URL(c.req.url).origin;
    const p = await initPayment({ orderId: order.id, amount: order.amount, description: `${TIERS[tier].name}: ${ad.title}`, origin, phone: u.phone });
    return json({ orderId: order.id, provider, amount: order.amount, paymentUrl: p.redirectUrl });
  }],
  ["POST", "orders/:id/test-pay", async (c) => {
    const u = need(c);
    if (freedomConfig()) return fail(404, "Тестовая оплата выключена");
    const o = await getOrder(c.db, c.params[0]);
    if (!o || o.userId !== u.id || o.provider !== "stub") return fail(404, "Заказ не найден");
    if (c.body.ok === true) await markPaid(c.db, o.id, `stub-${Date.now()}`, { stub: true, app: true });
    else await markFailed(c.db, o.id, { stub: true, app: true });
    return json({ status: (await getOrder(c.db, o.id))!.status });
  }],
  ["GET", "orders/:id", async (c) => {
    const o = await getOrder(c.db, c.params[0]);
    if (!o || o.userId !== need(c).id) return fail(404, "Заказ не найден");
    return json({ id: o.id, status: o.status, tier: o.tier, amount: o.amount, adId: o.adId });
  }],

  ["GET", "favorites", async (c) => json({ items: (await listFavorites(c.db, need(c).id)).map(cardJSON) })],

  ["GET", "chats", async (c) => {
    const list = await inbox(c.db, need(c).id);
    return json({
      items: list.map((x) => ({
        id: x.conversation.id, role: x.role, unread: x.unread, other: publicUser(x.other),
        ad: { id: x.ad.id, title: x.ad.title, price: x.ad.price, currency: x.ad.currency, status: x.ad.status },
        photo: x.photo ? { id: x.photo.id, blur: x.photo.blur } : null,
        last: { kind: x.last.kind, body: x.last.body, senderId: x.last.sender_id, createdAt: new Date(x.last.created_at).toISOString() },
      })),
    });
  }],
  ["GET", "chats/:id", async (c) => {
    const u = need(c);
    const t = await thread(c.db, c.params[0], u.id);
    if (!t) return fail(404, "Чат не найден");
    await markRead(c.db, c.params[0], u.id);
    return json({
      id: t.conversation.id, other: publicUser(t.other), blocked: t.blocked,
      ad: t.ad ? { id: t.ad.id, title: t.ad.title, price: t.ad.price, currency: t.ad.currency, city: t.ad.city } : null,
      photo: t.photo ? { id: t.photo.id, blur: t.photo.blur } : null,
      canReview: t.conversation.buyerId === u.id && !!(await canReview(c.db, u.id, t.other.id)),
      messages: t.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), readAt: m.readAt?.toISOString() ?? null })),
    });
  }],
  ["POST", "chats/:id/messages", async (c) => {
    const m = await sendMessage(c.db, c.params[0], need(c).id, c.body as never);
    return json({ ...m, createdAt: m.createdAt.toISOString(), readAt: null }, 201);
  }],
  ["POST", "chats/:id/read", async (c) => {
    await markRead(c.db, c.params[0], need(c).id);
    return json({ ok: true });
  }],

  ["GET", "users/:id", async ({ db, user, params: [id] }) => {
    const [u] = await db.select().from(users).where(and(eq(users.id, id)));
    if (!u || u.bannedAt) return fail(404, "Пользователь не найден");
    const page = await searchAds(db, { userId: id, city: "all" }, { limit: 60 });
    const revs = await reviewsFor(db, id);
    return json({
      user: publicUser(u), rating: await sellerRating(db, id), items: page.items.map(cardJSON),
      canReview: !!(user && (await canReview(db, user.id, id))),
      reviews: revs.map(({ review: r, author }) => ({ id: r.id, rating: r.rating, text: r.text, reply: r.reply, createdAt: r.createdAt.toISOString(), author })),
    });
  }],
  ["POST", "users/:id/reviews", async (c) => {
    await addReview(c.db, need(c).id, c.params[0], Number(c.body.rating), String(c.body.text ?? ""));
    return json({ ok: true }, 201);
  }],

  ["POST", "reports", async (c) => {
    const t = String(c.body.targetType);
    if (t !== "ad" && t !== "user" && t !== "message") return fail(422, "Неверная цель");
    await report(c.db, c.user?.id ?? null, t, String(c.body.targetId), String(c.body.reason), String(c.body.note ?? ""));
    return json({ ok: true }, 201);
  }],
];

function match(method: string, path: string[]) {
  for (const [m, pattern, h] of routes) {
    if (m !== method) continue;
    const parts = pattern.split("/");
    if (parts.length !== path.length) continue;
    const params: string[] = [];
    if (parts.every((p, i) => (p.startsWith(":") ? (params.push(decodeURIComponent(path[i])), true) : p === path[i]))) return { h, params };
  }
  return null;
}

async function handle(req: Request, ctx: RouteContext<"/api/v1/[...path]">) {
  const { path } = await ctx.params;
  const m = match(req.method, path);
  if (!m) return fail(404, "Нет такого метода");
  let body: Record<string, unknown> = {};
  if (req.method !== "GET" && req.headers.get("content-type")?.includes("application/json")) {
    body = (await req.json().catch(() => ({}))) ?? {};
  }
  try {
    return await m.h({ req, db: await getDb(), user: await currentUser(), params: m.params, body });
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.message);
    if (e instanceof AdValidationError) return fail(422, e.message, e.fields);
    if (e instanceof AuthError) return fail(e.code === "too_many_codes" || e.code === "too_many_tries" ? 429 : e.code === "banned" ? 403 : 422, e.message);
    if (e instanceof ChatError || e instanceof ReviewError || e instanceof PromoError) return fail(422, e.message);
    if (e instanceof Error && e.message === "not_found") return fail(404, "Не найдено");
    console.error(e);
    return fail(500, "Что-то сломалось, попробуйте ещё раз");
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
