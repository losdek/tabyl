import { expect, test, type APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { photo } from "./helpers";

/** The mobile app's path through /api/v1 with bearer tokens (no cookies). */
async function login(request: APIRequestContext, phone: string) {
  expect((await request.post("/api/v1/auth/code", { data: { phone } })).ok()).toBe(true);
  const { code } = await (await request.get(`/api/dev/last-code?phone=${encodeURIComponent(phone)}`)).json();
  const r = await request.post("/api/v1/auth/verify", { data: { phone, code } });
  expect(r.ok()).toBe(true);
  const j = await r.json();
  return { Authorization: `Bearer ${j.token}` };
}

test("app API: sign in, post, browse, chat, promote", async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL }); // no cookies, like the app
  const seller = await login(api, "+996770111222");
  const buyer = await login(api, "+996770333444");

  const meta = await (await api.get("/api/v1/meta")).json();
  expect(meta.categories.length).toBe(10);

  const up = await api.post("/api/upload", { headers: seller, multipart: { file: { name: "bike.webp", mimeType: "image/webp", buffer: await readFile(photo("bike")) } } });
  expect(up.ok()).toBe(true);
  const { id: photoId } = await up.json();

  const bad = await api.post("/api/v1/ads", { headers: seller, data: { category: "hobby", title: "x", price: 1, currency: "KGS", city: "bishkek", attrs: {} } });
  expect(bad.status()).toBe(422);
  expect((await bad.json()).fields.title).toBe("Минимум 3 символа");

  const created = await api.post("/api/v1/ads", {
    headers: seller,
    data: { category: "hobby", title: "Велосипед Cube Stereo", price: 115000, currency: "KGS", condition: "used", city: "karakol", attrs: { type: "Велосипеды" }, photoIds: [photoId] },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();

  const list = await (await api.get("/api/v1/ads?city=all&q=велосипед", { headers: buyer })).json();
  expect(list.items.map((a: { id: string }) => a.id)).toContain(id);
  const detail = await (await api.get(`/api/v1/ads/${id}`, { headers: buyer })).json();
  expect(detail.photos).toHaveLength(1);
  expect(detail.seller.hasPhone).toBe(true);
  expect((await (await api.post(`/api/v1/ads/${id}/phone`, { headers: buyer })).json()).phone).toBe("+996770111222");
  expect((await (await api.post(`/api/v1/ads/${id}/favorite`, { headers: buyer })).json()).on).toBe(true);

  const { conversationId } = await (await api.post(`/api/v1/ads/${id}/chat`, { headers: buyer })).json();
  await api.post(`/api/v1/chats/${conversationId}/messages`, { headers: buyer, data: { kind: "text", body: "Здравствуйте!" } });
  const inbox = await (await api.get("/api/v1/chats", { headers: seller })).json();
  expect(inbox.items[0]).toMatchObject({ id: conversationId, unread: 1, role: "seller" });
  const t = await (await api.get(`/api/v1/chats/${conversationId}`, { headers: seller })).json();
  expect(t.messages[0].body).toBe("Здравствуйте!");
  expect((await (await api.get("/api/v1/me", { headers: seller })).json()).unread).toBe(0);

  expect((await api.get("/api/v1/me")).status()).toBe(401);

  const promo = await (await api.post(`/api/v1/ads/${id}/promote`, { headers: seller, data: { tier: "top3" } })).json();
  expect(promo.provider).toBe("stub");
  const paid = await (await api.post(`/api/v1/orders/${promo.orderId}/test-pay`, { headers: seller, data: { ok: true } })).json();
  expect(paid.status).toBe("paid");
  await api.dispose();
});
