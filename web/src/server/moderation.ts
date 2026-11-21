import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { adPhotos, ads, auditLog, messages, reports, sessions, users } from "@/db/schema";
import { uuid } from "@/lib/ids";

/**
 * Post-moderation: ads go live at once, unless an automatic check holds them.
 * Holding flags put the ad into «на проверке»; soft flags only open a report.
 */
const FORBIDDEN = [
  "наркот", "закладк", "спайс", "мефедрон", "оружие", "пистолет", "патрон", "казино", "ставки на спорт",
  "поддельн", "фальшив", "паспорт продам", "диплом купить", "интим", "эскорт",
];
const PHONE_RE = /(?:\+?996|\b0)[\s\-()]*\d{3}[\s\-()]*\d{2,3}[\s\-()]*\d{2,3}[\s\-()]*\d{0,3}/;

export type Flag = { reason: string; hold: boolean; note: string };

export const REPORT_REASONS = {
  ad: ["Мошенничество", "Товар продан", "Неверная цена", "Запрещённый товар", "Дубликат", "Оскорбления", "Другое"],
  user: ["Мошенник", "Спам", "Оскорбления", "Другое"],
  message: ["Спам", "Оскорбления", "Мошенничество", "Другое"],
} as const;

export async function autoCheckAd(db: DB, adId: string): Promise<Flag[]> {
  const [ad] = await db.select().from(ads).where(eq(ads.id, adId)).limit(1);
  if (!ad) return [];
  const text = `${ad.title}\n${ad.description}`.toLowerCase();
  const flags: Flag[] = [];
  const word = FORBIDDEN.find((w) => text.includes(w));
  if (word) flags.push({ reason: "Запрещённый товар", hold: true, note: `Слово «${word}»` });
  if (PHONE_RE.test(text)) flags.push({ reason: "Телефон в тексте", hold: false, note: "Номер в описании — в обход кнопки «Показать телефон»" });

  // the same photo already used in another seller's active ad
  const photos = await db.select({ phash: adPhotos.phash }).from(adPhotos).where(eq(adPhotos.adId, adId));
  if (photos.length) {
    const dup = await db
      .select({ adId: adPhotos.adId })
      .from(adPhotos)
      .innerJoin(ads, eq(ads.id, adPhotos.adId))
      .where(and(inArray(adPhotos.phash, photos.map((p) => p.phash)), ne(ads.userId, ad.userId), eq(ads.status, "active")))
      .limit(1);
    if (dup.length) flags.push({ reason: "Дубликат", hold: true, note: `Фото совпадает с объявлением ${dup[0].adId}` });
  }

  // replace earlier automatic reports for this ad, so editing clears stale flags
  await db.delete(reports).where(and(eq(reports.targetType, "ad"), eq(reports.targetId, adId), eq(reports.auto, true), eq(reports.status, "open")));
  for (const f of flags) {
    await db.insert(reports).values({ id: uuid(), targetType: "ad", targetId: adId, reason: f.reason, note: f.note, auto: true });
  }
  if (flags.some((f) => f.hold) && ad.status === "active") {
    await db.update(ads).set({ status: "pending" }).where(eq(ads.id, adId));
  }
  return flags;
}

export async function report(
  db: DB,
  reporterId: string | null,
  targetType: "ad" | "user" | "message",
  targetId: string,
  reason: string,
  note = "",
) {
  const allowed: readonly string[] = REPORT_REASONS[targetType];
  if (!allowed.includes(reason)) throw new Error("bad_reason");
  await db.insert(reports).values({ id: uuid(), reporterId, targetType, targetId, reason, note: note.slice(0, 500) });
  // three independent fraud reports hide an ad until a moderator looks
  if (targetType === "ad" && reason === "Мошенничество") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(distinct ${reports.reporterId})::int` })
      .from(reports)
      .where(and(eq(reports.targetType, "ad"), eq(reports.targetId, targetId), eq(reports.reason, "Мошенничество"), eq(reports.status, "open")));
    if (n >= 3) await db.update(ads).set({ status: "pending" }).where(and(eq(ads.id, targetId), eq(ads.status, "active")));
  }
}

async function audit(db: DB, actorId: string, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
  await db.insert(auditLog).values({ id: uuid(), actorId, action, targetType, targetId, details });
}

export async function queue(db: DB) {
  const open = await db.select().from(reports).where(eq(reports.status, "open")).orderBy(desc(reports.createdAt)).limit(200);
  const pending = await db.select().from(ads).where(eq(ads.status, "pending")).orderBy(desc(ads.updatedAt)).limit(200);
  return { reports: open, pending };
}

export async function approveAd(db: DB, adminId: string, adId: string) {
  await db.update(ads).set({ status: "active", rejectReason: null }).where(eq(ads.id, adId));
  await db
    .update(reports)
    .set({ status: "dismissed", resolution: "Объявление одобрено", resolvedBy: adminId, resolvedAt: new Date() })
    .where(and(eq(reports.targetType, "ad"), eq(reports.targetId, adId), eq(reports.status, "open")));
  await audit(db, adminId, "ad.approve", "ad", adId);
}

export async function rejectAd(db: DB, adminId: string, adId: string, reason: string) {
  await db.update(ads).set({ status: "rejected", rejectReason: reason.slice(0, 300) }).where(eq(ads.id, adId));
  await db
    .update(reports)
    .set({ status: "resolved", resolution: `Отклонено: ${reason}`, resolvedBy: adminId, resolvedAt: new Date() })
    .where(and(eq(reports.targetType, "ad"), eq(reports.targetId, adId), eq(reports.status, "open")));
  await audit(db, adminId, "ad.reject", "ad", adId, { reason });
}

export async function dismissReport(db: DB, adminId: string, reportId: string) {
  await db
    .update(reports)
    .set({ status: "dismissed", resolution: "Нарушения нет", resolvedBy: adminId, resolvedAt: new Date() })
    .where(eq(reports.id, reportId));
  await audit(db, adminId, "report.dismiss", "report", reportId);
}

export async function banUser(db: DB, adminId: string, userId: string, reason: string) {
  await db.update(users).set({ bannedAt: new Date(), banReason: reason.slice(0, 300) }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.update(ads).set({ status: "closed" }).where(and(eq(ads.userId, userId), eq(ads.status, "active")));
  await audit(db, adminId, "user.ban", "user", userId, { reason });
}

export async function unbanUser(db: DB, adminId: string, userId: string) {
  await db.update(users).set({ bannedAt: null, banReason: null }).where(eq(users.id, userId));
  await audit(db, adminId, "user.unban", "user", userId);
}

export async function deleteMessage(db: DB, adminId: string, messageId: string) {
  await db.update(messages).set({ body: "Сообщение удалено модератором", kind: "text", payload: null }).where(eq(messages.id, messageId));
  await audit(db, adminId, "message.delete", "message", messageId);
}

export async function recentAudit(db: DB, limit = 100) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}
