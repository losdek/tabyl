import { beforeEach, describe, expect, it } from "vitest";
import type { DB } from "@/db/client";
import { freshDb } from "./helpers";
import { AuthError, requestCode, userForToken, verifyCode, type CodeSender } from "@/server/auth-core";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

let db: DB;
let last = "";
const send: CodeSender = async (_p, c) => {
  last = c;
};
beforeEach(async () => {
  db = await freshDb();
});

describe("phone sign-in", () => {
  it("signs in with the right code and creates one user per phone", async () => {
    await requestCode(db, "0700 123 456", send);
    const s = await verifyCode(db, "+996700123456", last);
    const u = await userForToken(db, s.token);
    expect(u?.phone).toBe("+996700123456");

    await requestCode(db, "700123456", send);
    const s2 = await verifyCode(db, "700123456", last);
    expect(s2.userId).toBe(s.userId);
  });

  it("rejects a wrong code and locks after five tries", async () => {
    await requestCode(db, "700000001", send);
    for (let i = 0; i < 5; i++) await expect(verifyCode(db, "700000001", "000000")).rejects.toThrow("Неверный код");
    await expect(verifyCode(db, "700000001", last)).rejects.toMatchObject({ code: "too_many_tries" });
  });

  it("limits codes per hour", async () => {
    for (let i = 0; i < 5; i++) await requestCode(db, "700000002", send);
    await expect(requestCode(db, "700000002", send)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects expired codes and bad phones", async () => {
    const past = new Date(Date.now() - 10 * 60_000);
    await requestCode(db, "700000003", send, past);
    await expect(verifyCode(db, "700000003", last)).rejects.toMatchObject({ code: "no_code" });
    await expect(requestCode(db, "12345", send)).rejects.toMatchObject({ code: "bad_phone" });
  });

  it("refuses banned users and kills their sessions", async () => {
    await requestCode(db, "700000004", send);
    const s = await verifyCode(db, "700000004", last);
    await db.update(users).set({ bannedAt: new Date() }).where(eq(users.id, s.userId));
    expect(await userForToken(db, s.token)).toBeNull();
    await requestCode(db, "700000004", send);
    await expect(verifyCode(db, "700000004", last)).rejects.toMatchObject({ code: "banned" });
  });
});
