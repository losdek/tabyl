"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { countView, deleteAd, getAd, setAdStatus } from "@/server/ads";
import { ChatError, startConversation } from "@/server/chat";
import { report } from "@/server/moderation";
import { currentUser, requireUser } from "@/server/session";

export async function writeToSeller(adId: string) {
  const user = await requireUser(`/ad/${adId}`);
  try {
    const c = await startConversation(await getDb(), adId, user.id);
    redirect(`/chats/${c.id}`);
  } catch (e) {
    if (e instanceof ChatError) redirect(`/ad/${adId}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
}

/** Reveal the seller's phone; counted, and only for signed-in visitors. */
export async function revealPhone(adId: string): Promise<{ phone: string } | { login: true } | { none: true }> {
  const user = await currentUser();
  if (!user) return { login: true };
  const db = await getDb();
  const ad = await getAd(db, adId);
  if (!ad || !ad.seller.phone) return { none: true };
  await countView(db, adId, "phoneViews");
  return { phone: ad.seller.phone };
}

export async function changeStatus(adId: string, status: "active" | "sold" | "closed") {
  const user = await requireUser(`/ad/${adId}`);
  await setAdStatus(await getDb(), user.id, adId, status);
  refresh();
}

export async function removeAd(adId: string) {
  const user = await requireUser(`/ad/${adId}`);
  await deleteAd(await getDb(), user.id, adId);
  redirect("/profile?deleted=1");
}

export async function reportAd(adId: string, form: FormData): Promise<string> {
  const user = await currentUser();
  const reason = String(form.get("reason") ?? "");
  try {
    await report(await getDb(), user?.id ?? null, "ad", adId, reason, String(form.get("note") ?? ""));
    return "Спасибо, модератор посмотрит";
  } catch {
    return "Выберите причину";
  }
}
