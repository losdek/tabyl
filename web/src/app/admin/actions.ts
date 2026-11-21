"use server";
import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { approveAd, banUser, deleteMessage, dismissReport, rejectAd, unbanUser } from "@/server/moderation";
import { refundOrder } from "@/server/promo";
import { requireAdmin } from "@/server/session";

async function run(fn: (adminId: string) => Promise<unknown>) {
  const admin = await requireAdmin();
  await fn(admin.id);
  refresh();
}

export async function approveAction(adId: string) {
  await run(async (a) => approveAd(await getDb(), a, adId));
}
export async function rejectAction(adId: string, form: FormData) {
  const reason = String(form.get("reason") ?? "").trim() || "Нарушение правил";
  await run(async (a) => rejectAd(await getDb(), a, adId, reason));
}
export async function dismissAction(reportId: string) {
  await run(async (a) => dismissReport(await getDb(), a, reportId));
}
export async function banAction(userId: string, form: FormData) {
  const reason = String(form.get("reason") ?? "").trim() || "Нарушение правил";
  await run(async (a) => banUser(await getDb(), a, userId, reason));
}
export async function unbanAction(userId: string) {
  await run(async (a) => unbanUser(await getDb(), a, userId));
}
export async function deleteMessageAction(messageId: string) {
  await run(async (a) => deleteMessage(await getDb(), a, messageId));
}
export async function refundAction(orderId: string) {
  await run(async () => refundOrder(await getDb(), orderId));
}
