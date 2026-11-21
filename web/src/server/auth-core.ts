/**
 * Accounts and sessions, independent of Next.js so it can be unit-tested and
 * shared by the website (cookies) and the mobile API (bearer tokens).
 */
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import type { DB } from "@/db/client";
import { loginCodes, sessions, users } from "@/db/schema";
import { sha256, token, uuid } from "@/lib/ids";
import { normalizePhone } from "@/lib/format";

export const SESSION_DAYS = 90;
export const CODE_TTL_MS = 5 * 60_000;
export const CODES_PER_HOUR = 5;
export const TRIES_PER_CODE = 5;

export type User = typeof users.$inferSelect;

export class AuthError extends Error {
  constructor(
    public code: "bad_phone" | "too_many_codes" | "no_code" | "wrong_code" | "too_many_tries" | "banned",
    message: string,
  ) {
    super(message);
  }
}

const secret = () => process.env.TABYL_SECRET ?? "dev-only-secret-change-me";
const hashCode = (phone: string, code: string) => sha256(`${secret()}:${phone}:${code}`);

/** Delivery is pluggable: SMS provider in production, terminal locally. */
export type CodeSender = (phone: string, code: string) => Promise<void>;

const g = globalThis as unknown as { __tabylLastCodes?: Map<string, string> };
export const devLastCodes = (g.__tabylLastCodes ??= new Map());

export const devSender: CodeSender = async (phone, code) => {
  devLastCodes.set(phone, code);
  console.log(`\n  [tabyl] код входа для ${phone}: ${code}\n`);
};

export async function requestCode(db: DB, rawPhone: string, send: CodeSender = devSender, now = new Date()) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new AuthError("bad_phone", "Проверьте номер: нужно 9 цифр после +996");
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginCodes)
    .where(and(eq(loginCodes.phone, phone), gt(loginCodes.createdAt, hourAgo)));
  if (n >= CODES_PER_HOUR) throw new AuthError("too_many_codes", "Слишком много кодов за час. Попробуйте позже");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(loginCodes).values({
    id: uuid(),
    phone,
    codeHash: hashCode(phone, code),
    createdAt: now,
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
  });
  await send(phone, code);
  return { phone };
}

export async function verifyCode(db: DB, rawPhone: string, code: string, kind: "web" | "app" = "web", now = new Date()) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new AuthError("bad_phone", "Проверьте номер");
  const [row] = await db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.phone, phone), isNull(loginCodes.usedAt), gt(loginCodes.expiresAt, now)))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);
  if (!row) throw new AuthError("no_code", "Код устарел. Запросите новый");
  if (row.attempts >= TRIES_PER_CODE) throw new AuthError("too_many_tries", "Слишком много попыток. Запросите новый код");

  const ok = timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hashCode(phone, code.trim())));
  if (!ok) {
    await db.update(loginCodes).set({ attempts: row.attempts + 1 }).where(eq(loginCodes.id, row.id));
    throw new AuthError("wrong_code", "Неверный код");
  }
  await db.update(loginCodes).set({ usedAt: now }).where(eq(loginCodes.id, row.id));

  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) [user] = await db.insert(users).values({ id: uuid(), phone }).returning();
  if (user.bannedAt) throw new AuthError("banned", "Аккаунт заблокирован модератором");
  return createSession(db, user.id, kind, now);
}

export async function createSession(db: DB, userId: string, kind: "web" | "app" = "web", now = new Date()) {
  const raw = token();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: sha256(raw), userId, kind, createdAt: now, expiresAt });
  return { token: raw, expiresAt, userId };
}

export async function userForToken(db: DB, raw: string | undefined | null, now = new Date()): Promise<User | null> {
  if (!raw) return null;
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sha256(raw)))
    .limit(1);
  if (!row || row.expiresAt <= now || row.user.bannedAt) return null;
  // presence: refresh at most once a minute
  if (now.getTime() - row.user.lastSeenAt.getTime() > 60_000) {
    await db.update(users).set({ lastSeenAt: now }).where(eq(users.id, row.user.id));
  }
  return row.user;
}

export async function endSession(db: DB, raw: string) {
  await db.delete(sessions).where(eq(sessions.id, sha256(raw)));
}

/** Find or create a user for a Google account; link to `linkTo` when signed in. */
export async function userForGoogle(
  db: DB,
  info: { sub: string; email?: string; name?: string },
  linkTo?: User | null,
): Promise<User> {
  const [existing] = await db.select().from(users).where(eq(users.googleSub, info.sub)).limit(1);
  if (existing) {
    if (existing.bannedAt) throw new AuthError("banned", "Аккаунт заблокирован модератором");
    return existing;
  }
  if (linkTo) {
    const [u] = await db
      .update(users)
      .set({ googleSub: info.sub, email: linkTo.email ?? info.email ?? null })
      .where(eq(users.id, linkTo.id))
      .returning();
    return u;
  }
  const [u] = await db
    .insert(users)
    .values({ id: uuid(), googleSub: info.sub, email: info.email ?? null, name: info.name ?? "" })
    .returning();
  return u;
}
