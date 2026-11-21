"use server";
import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { addReview, replyToReview, ReviewError } from "@/server/reviews";
import { currentUser } from "@/server/session";

export async function reviewAction(sellerId: string, _: string, form: FormData): Promise<string> {
  const user = await currentUser();
  if (!user) return "Войдите снова";
  try {
    await addReview(await getDb(), user.id, sellerId, Number(form.get("rating")), String(form.get("text") ?? ""));
    refresh();
    return "ok";
  } catch (e) {
    if (e instanceof ReviewError) return e.message;
    throw e;
  }
}

export async function replyAction(reviewId: string, _: string, form: FormData): Promise<string> {
  const user = await currentUser();
  if (!user) return "Войдите снова";
  try {
    await replyToReview(await getDb(), user.id, reviewId, String(form.get("reply") ?? ""));
    refresh();
    return "ok";
  } catch (e) {
    if (e instanceof ReviewError) return e.message;
    throw e;
  }
}
