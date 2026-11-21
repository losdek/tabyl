"use server";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { AuthError, requestCode, verifyCode } from "@/server/auth-core";
import { setSessionCookie } from "@/server/session";

export type LoginState = { step: "phone" | "code"; phone: string; error?: string; next: string };

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const db = await getDb();
  const next = safeNext(String(form.get("next") ?? prev.next ?? "/"));
  const intent = String(form.get("intent") ?? "send");
  try {
    if (intent === "send" || intent === "resend") {
      const phone = String(form.get("phone") ?? prev.phone);
      const r = await requestCode(db, phone);
      return { step: "code", phone: r.phone, next };
    }
    if (intent === "change") return { step: "phone", phone: prev.phone, next };
    const s = await verifyCode(db, prev.phone, String(form.get("code") ?? ""));
    await setSessionCookie(s.token);
  } catch (e) {
    if (e instanceof AuthError) return { ...prev, next, error: e.message };
    throw e;
  }
  redirect(next);
}
