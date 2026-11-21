import { beforeEach, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import { users } from "@/db/schema";
import { createAd } from "@/server/ads";
import { bus, hadRealConversation, inbox, markRead, sendMessage, setBlocked, startConversation, thread, unreadCount } from "@/server/chat";
import { freshDb } from "./helpers";

let db: DB;
let adId: string;
beforeEach(async () => {
  db = await freshDb();
  await db.insert(users).values([{ id: "s", name: "Нурлан" }, { id: "b", name: "Айгерим" }]);
  ({ id: adId } = await createAd(db, "s", {
    category: "electronics", title: "iPhone 15 Pro", price: 92000, currency: "KGS", city: "bishkek", attrs: { type: "Телефоны" },
  }));
});

describe("chat", () => {
  it("one thread per ad and buyer, live events, unread and read", async () => {
    const c = await startConversation(db, adId, "b");
    expect((await startConversation(db, adId, "b")).id).toBe(c.id);
    const events: unknown[] = [];
    const on = (e: unknown) => events.push(e);
    bus.on(`conv:${c.id}`, on);
    await sendMessage(db, c.id, "b", { kind: "text", body: "Здравствуйте! Ещё продаёте?" });
    await sendMessage(db, c.id, "s", { kind: "place", address: "ул. Ахунбаева, 98", note: "во дворе" });
    bus.off(`conv:${c.id}`, on);
    expect(events).toHaveLength(2);
    expect(await unreadCount(db, "s")).toBe(1);
    await markRead(db, c.id, "s");
    expect(await unreadCount(db, "s")).toBe(0);
    const box = await inbox(db, "b");
    expect(box[0]).toMatchObject({ unread: 1, role: "buyer" });
    expect(box[0].last.kind).toBe("place");
    expect((await thread(db, c.id, "x"))).toBeNull();
    expect(await hadRealConversation(db, "b", "s")).toBe(c.id);
  });

  it("refuses own ad and blocked users", async () => {
    await expect(startConversation(db, adId, "s")).rejects.toThrow("Это ваше объявление");
    const c = await startConversation(db, adId, "b");
    await setBlocked(db, "s", "b", true);
    await expect(sendMessage(db, c.id, "b", { kind: "text", body: "привет" })).rejects.toThrow();
  });
});
