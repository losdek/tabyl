"use server";
import { getDb } from "@/db/client";
import { AdValidationError, createAd, updateAd, type AdInput } from "@/server/ads";
import { currentUser } from "@/server/session";

export type SaveResult = { ok: true; id: string; held: boolean } | { ok: false; errors: Record<string, string> };

export async function saveAdAction(id: string | null, input: AdInput): Promise<SaveResult> {
  const user = await currentUser();
  if (!user) return { ok: false, errors: { _: "Войдите, чтобы подать объявление" } };
  const db = await getDb();
  try {
    if (id) {
      const r = await updateAd(db, user.id, id, input);
      return { ok: true, id: r.id, held: r.flags.some((f) => f.hold) };
    }
    const r = await createAd(db, user.id, input);
    return { ok: true, id: r.id, held: r.status === "pending" };
  } catch (e) {
    if (e instanceof AdValidationError) return { ok: false, errors: e.fields };
    if (e instanceof Error && e.message === "not_found") return { ok: false, errors: { _: "Объявление не найдено" } };
    throw e;
  }
}
