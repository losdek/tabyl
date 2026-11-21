import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { createAd, type AdInput } from "@/server/ads";
import { createSession } from "@/server/auth-core";
import { sendMessage, startConversation } from "@/server/chat";
import { saveUpload } from "@/server/photos";

/**
 * Preview data for design checks ONLY. Works when TABYL_PREVIEW=1, which is only
 * set for the throwaway preview database (.data/preview). Never in production.
 */
export async function POST() {
  if (process.env.TABYL_PREVIEW !== "1" || process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const db = await getDb();
  await db.insert(users).values([
    { id: "seller-1", phone: "+996700100200", name: "Нурлан", city: "bishkek" },
    { id: "buyer-1", phone: "+996555300400", name: "Айгерим", city: "bishkek" },
  ]).onConflictDoNothing();
  const img = (k: string) => readFile(path.join(process.cwd(), "..", "design", "directions", "img", `${k}.webp`));
  const items: [string, AdInput][] = [
    ["iphone", { category: "electronics", title: "iPhone 15 Pro, 256 ГБ, натуральный титан", price: 92000, currency: "KGS", condition: "used", city: "bishkek", district: "ЦУМ", attrs: { type: "Телефоны", brand: "Apple" }, description: "Как новый, батарея 96 %. Коробка и чек есть." }],
    ["camry", { category: "transport", title: "Toyota Camry 70, 2019", price: 24500, currency: "USD", city: "bishkek", district: "Джал", attrs: { brand: "Toyota", model: "Camry", year: 2019, mileage: 86000, gearbox: "Автомат", fuel: "Бензин", engine: 2.5, wheel: "Левый", customs: true }, description: "Один хозяин, обслуживание у официального дилера, все чеки есть. Не бита, не крашена. Торг у машины.", negotiable: true }],
    ["kitten", { category: "animals", title: "Котёнок, 2 месяца, в добрые руки", price: 0, currency: "KGS", city: "bishkek", district: "Кок-Жар", attrs: { type: "Кошки" }, description: "Приучен к лотку, ест всё." }],
    ["bike", { category: "hobby", title: "Велосипед Cube Stereo, рама L", price: 115000, currency: "KGS", condition: "used", city: "karakol", attrs: { type: "Велосипеды" } }],
    ["sofa", { category: "home", title: "Угловой диван, серый, почти новый", price: 28000, currency: "KGS", condition: "used", city: "bishkek", district: "Восток-5", attrs: { type: "Мебель" } }],
    ["jacket", { category: "clothes", title: "Куртка Polo Ralph Lauren, M", price: 6500, currency: "KGS", condition: "new", city: "bishkek", district: "Дордой", attrs: { type: "Мужская одежда", size: "M" } }],
    ["laptop", { category: "electronics", title: "MacBook Air M2, 8/256", price: 68000, currency: "KGS", condition: "used", city: "bishkek", attrs: { type: "Ноутбуки", brand: "Apple" } }],
    ["fridge", { category: "home", title: "Холодильник Samsung No Frost", price: 21500, currency: "KGS", condition: "used", city: "osh", attrs: { type: "Бытовая техника" } }],
    ["lexus", { category: "transport", title: "Lexus RX 450h+, 2023", price: 71000, currency: "USD", city: "bishkek", attrs: { brand: "Lexus", model: "RX 450h+", year: 2023, mileage: 12000, fuel: "Гибрид", gearbox: "Автомат" } }],
    ["sneakers", { category: "clothes", title: "Кеды кожаные, 41 р.", price: 2900, currency: "KGS", condition: "new", city: "osh", attrs: { type: "Обувь", size: "41" } }],
    ["apartment", { category: "realty", title: "2-комн. квартира, 64 м², 7/12 эт.", price: 78000, currency: "USD", city: "bishkek", district: "Асанбай", attrs: { deal: "Продажа", type: "Квартира", rooms: 2, area: 64, floor: 7, floors: 12, series: "Элитка" } }],
  ];
  const ids: string[] = [];
  let t = Date.now();
  for (const [k, input] of items) {
    const p = await saveUpload(db, "seller-1", await img(k));
    const r = await createAd(db, "seller-1", { ...input, photoIds: [p.id] }, new Date((t -= 7 * 60_000)));
    ids.push(r.id);
  }
  const camry = ids[1];
  const c = await startConversation(db, camry, "buyer-1");
  await sendMessage(db, c.id, "buyer-1", { kind: "text", body: "Здравствуйте! Ещё продаёте?" });
  await sendMessage(db, c.id, "buyer-1", { kind: "text", body: "Можно сегодня вечером посмотреть?" });
  await sendMessage(db, c.id, "seller-1", { kind: "text", body: "Да, продаю. После шести буду дома, подъезжайте" });
  await sendMessage(db, c.id, "seller-1", { kind: "place", address: "ул. Ахунбаева, 98", note: "Джал, во дворе за «Глобусом»" });
  const buyer = await createSession(db, "buyer-1");
  const seller = await createSession(db, "seller-1");
  return Response.json({ ads: ids, conversation: c.id, buyerToken: buyer.token, sellerToken: seller.token });
}
