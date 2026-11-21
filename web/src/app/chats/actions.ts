"use server";
import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { ChatError, conversationFor, markRead, sendMessage, setBlocked, type Outgoing } from "@/server/chat";
import { report } from "@/server/moderation";
import { currentUser } from "@/server/session";

export async function sendAction(conversationId: string, m: Outgoing): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Войдите снова" };
  try {
    const msg = await sendMessage(await getDb(), conversationId, user.id, m);
    return { ok: true, id: msg.id };
  } catch (e) {
    if (e instanceof ChatError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function readAction(conversationId: string) {
  const user = await currentUser();
  if (user) await markRead(await getDb(), conversationId, user.id);
}

export async function blockAction(conversationId: string, block: boolean) {
  const user = await currentUser();
  if (!user) return;
  const db = await getDb();
  const c = await conversationFor(db, conversationId, user.id);
  if (!c) return;
  await setBlocked(db, user.id, c.buyerId === user.id ? c.sellerId : c.buyerId, block);
  refresh();
}


export async function reportUserAction(conversationId: string, form: FormData) {
  const user = await currentUser();
  if (!user) return;
  const db = await getDb();
  const c = await conversationFor(db, conversationId, user.id);
  if (!c) return;
  const reason = String(form.get("reason") ?? "Мошенник");
  await report(db, user.id, "user", c.buyerId === user.id ? c.sellerId : c.buyerId, ["Мошенник", "Спам", "Оскорбления"].includes(reason) ? reason : "Другое", `Из чата ${conversationId}`);
  refresh();
}
