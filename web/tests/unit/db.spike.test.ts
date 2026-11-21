import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { openTestDb } from "@/db/client";
import { ads, users } from "@/db/schema";

describe("database spike: PGlite + Drizzle + Russian search", () => {
  it("matches Russian word forms and typos", async () => {
    const db = await openTestDb();
    await db.insert(users).values({ id: "u1", phone: "+996700000001", name: "Тест" });
    await db.insert(ads).values([
      { id: "a1", userId: "u1", category: "hobby", title: "Продаю велосипеды Cube", city: "bishkek", status: "active" },
      { id: "a2", userId: "u1", category: "electronics", title: "Айфон 15 про, 256 ГБ", city: "bishkek", status: "active" },
    ]);

    // stemming: «велосипед» finds «велосипеды»
    const fts = await db.execute<{ id: string }>(
      sql`select id from ads where search @@ plainto_tsquery('russian', 'велосипед')`,
    );
    expect(fts.rows.map((r) => r.id)).toEqual(["a1"]);

    // typo tolerance: «айфн» is close to «айфон»
    const trgm = await db.execute<{ id: string }>(
      sql`select id from ads where word_similarity('айфн', title) > 0.3 order by word_similarity('айфн', title) desc`,
    );
    expect(trgm.rows[0]?.id).toBe("a2");
  });
});
