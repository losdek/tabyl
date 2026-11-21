import { beforeEach, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import { users } from "@/db/schema";
import {
  AdValidationError, countAds, createAd, getAd, mixPromoted, searchAds, setAdStatus, toggleFavorite, updateAd, type AdInput,
} from "@/server/ads";
import { approveAd, report } from "@/server/moderation";
import { freshDb } from "./helpers";

let db: DB;
const car = (o: Partial<AdInput> = {}): AdInput => ({
  category: "transport", title: "Toyota Camry 70, 2019", description: "Один хозяин", price: 24500, currency: "USD",
  city: "bishkek", attrs: { brand: "Toyota", model: "Camry", year: 2019, mileage: "86 000", gearbox: "Автомат", customs: true }, ...o,
});
const phone = (o: Partial<AdInput> = {}): AdInput => ({
  category: "electronics", title: "iPhone 15 Pro, 256 ГБ", price: 92000, currency: "KGS", condition: "used",
  city: "bishkek", attrs: { type: "Телефоны", brand: "Apple" }, ...o,
});

beforeEach(async () => {
  db = await freshDb();
  await db.insert(users).values([{ id: "s", phone: "+996700000001" }, { id: "b", phone: "+996700000002" }]);
});

describe("posting", () => {
  it("validates category attributes and normalises numbers", async () => {
    const { id } = await createAd(db, "s", car());
    const ad = await getAd(db, id);
    expect(ad?.ad.attrs).toMatchObject({ year: 2019, mileage: 86000, customs: true });
    expect(ad?.ad.condition).toBeNull();
  });

  it("reports field errors in Russian", async () => {
    await expect(createAd(db, "s", car({ title: "ab", attrs: { brand: "Жигули-нет" } }))).rejects.toSatisfy((e) => {
      const f = (e as AdValidationError).fields;
      return f.title === "Минимум 3 символа" && f["attrs.brand"] === "Выберите из списка" && f["attrs.year"] === "Заполните поле";
    });
  });

  it("holds ads with forbidden words, soft-flags phone numbers in text", async () => {
    const held = await createAd(db, "s", phone({ title: "Продам пистолет травматический" }));
    expect(held.status).toBe("pending");
    const soft = await createAd(db, "s", phone({ description: "звоните 0700 12 34 56" }));
    expect(soft.status).toBe("active");
    expect(soft.flags.map((f) => f.reason)).toEqual(["Телефон в тексте"]);
  });

  it("lets only the owner edit and change status", async () => {
    const { id } = await createAd(db, "s", phone());
    await expect(updateAd(db, "b", id, phone({ title: "чужое" }))).rejects.toThrow();
    await setAdStatus(db, "s", id, "sold");
    expect((await getAd(db, id))?.ad.status).toBe("sold");
  });
});

describe("search", () => {
  it("finds by stem and typo, filters by price, city and attributes", async () => {
    await createAd(db, "s", car());
    await createAd(db, "s", car({ title: "Lexus RX 450h", price: 71000, attrs: { brand: "Lexus", model: "RX", year: 2023 } }));
    await createAd(db, "s", phone());
    await createAd(db, "s", phone({ title: "Айфон 13", price: 40000, city: "osh" }));

    const byTypo = await searchAds(db, { q: "айфн" });
    expect(byTypo.items.map((a) => a.title)).toContain("Айфон 13");
    const cheap = await searchAds(db, { category: "transport", priceMax: 30000 });
    expect(cheap.items.map((a) => a.title)).toEqual(["Toyota Camry 70, 2019"]);
    const lexus = await searchAds(db, { category: "transport", attrs: { brand: "Lexus" } });
    expect(lexus.items).toHaveLength(1);
    const newer = await searchAds(db, { category: "transport", attrs: { yearmin: "2020" } });
    expect(newer.items.map((a) => a.title)).toEqual(["Lexus RX 450h"]);
    expect(await countAds(db, { city: "osh" })).toBe(1);
  });

  it("pages new-first with a stable cursor", async () => {
    for (let i = 0; i < 7; i++) await createAd(db, "s", phone({ title: `Телефон ${i}` }), new Date(Date.now() - i * 1000));
    const p1 = await searchAds(db, {}, { limit: 3 });
    const p2 = await searchAds(db, {}, { limit: 3, cursor: p1.nextCursor! });
    const p3 = await searchAds(db, {}, { limit: 3, cursor: p2.nextCursor! });
    expect([...p1.items, ...p2.items, ...p3.items].map((a) => a.title)).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => `Телефон ${i}`));
    expect(p3.nextCursor).toBeNull();
  });

  it("puts promoted ads in fixed slots without duplicates", () => {
    const mk = (id: string, promoted = false) => ({ id, promoted }) as never;
    const out = mixPromoted([mk("a"), mk("b"), mk("c"), mk("d")], [mk("x", true), mk("b", true)]);
    expect(out.map((a: { id: string }) => a.id)).toEqual(["a", "b", "x", "c", "d"]);
  });
});

describe("favourites and reports", () => {
  it("toggles favourites", async () => {
    const { id } = await createAd(db, "s", phone());
    expect(await toggleFavorite(db, "b", id)).toBe(true);
    expect(await toggleFavorite(db, "b", id)).toBe(false);
  });

  it("hides an ad after three fraud reports until a moderator approves it", async () => {
    const { id } = await createAd(db, "s", phone());
    await db.insert(users).values([{ id: "r1" }, { id: "r2" }, { id: "r3" }, { id: "adm", role: "admin" }]);
    for (const r of ["r1", "r2", "r3"]) await report(db, r, "ad", id, "Мошенничество");
    expect((await getAd(db, id))?.ad.status).toBe("pending");
    await approveAd(db, "adm", id);
    expect((await getAd(db, id))?.ad.status).toBe("active");
  });
});
