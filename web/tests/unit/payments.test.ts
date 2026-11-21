import { beforeEach, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import { users } from "@/db/schema";
import { createAd, getAd, mixPromoted, promotedAds, searchAds } from "@/server/ads";
import { sign, verify } from "@/server/payments/freedom";
import { createOrder, getOrder, markPaid, PromoError } from "@/server/promo";
import { freshDb } from "./helpers";

describe("Freedom Pay signature", () => {
  it("matches the documented test vectors", () => {
    const p = { pg_amount: "100", pg_currency: "KZT", pg_description: "Order #1001", pg_merchant_id: "12345", pg_order_id: "order_1001", pg_salt: "a1b2c3d4" };
    expect(sign("init_payment.php", p, "test_secret_key")).toBe("b9ad75871668ca040f80f5f6b530e6ed");
    const nested = {
      pg_amount: "100", pg_description: "Order #1001", pg_merchant_id: "12345", pg_order_id: "order_1001",
      pg_receipt_positions: { "0": { count: "1", name: "Book", price: "100", tax_type: "0" } }, pg_salt: "a1b2c3d4",
    };
    expect(sign("init_payment.php", nested, "test_secret_key")).toBe("895bb645704260ac46cf3986038cdca5");
  });

  it("verifies callbacks and rejects tampering", () => {
    const cb: Record<string, string> = { pg_order_id: "o1", pg_payment_id: "77", pg_result: "1", pg_salt: "s" };
    cb.pg_sig = sign("result", cb, "k");
    expect(verify("result", cb, "k")).toBe(true);
    expect(verify("result", { ...cb, pg_result: "0" }, "k")).toBe(false);
  });
});

describe("promotion", () => {
  let db: DB;
  beforeEach(async () => {
    db = await freshDb();
    await db.insert(users).values([{ id: "s" }, { id: "x" }]);
  });

  it("applies a paid order once and shows the ad in the top slots", async () => {
    const { id } = await createAd(db, "s", { category: "electronics", title: "iPhone 15 Pro", price: 92000, currency: "KGS", city: "bishkek", attrs: { type: "Телефоны" } });
    await expect(createOrder(db, "x", id, "top7", "stub")).rejects.toBeInstanceOf(PromoError);
    const { order } = await createOrder(db, "s", id, "top7", "stub");
    expect(await markPaid(db, order.id, "p1", {})).toBe(true);
    expect(await markPaid(db, order.id, "p1", {})).toBe(false); // duplicate callback
    const ad = (await getAd(db, id))!.ad;
    const days = (ad.promotedUntil!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect((await getOrder(db, order.id))?.status).toBe("paid");

    const promoted = await promotedAds(db, { city: "bishkek" });
    expect(promoted.map((a) => a.id)).toEqual([id]);
    const page = await searchAds(db, { city: "bishkek" });
    expect(mixPromoted(page.items, promoted).filter((a) => a.id === id)).toHaveLength(1);
  });
});
