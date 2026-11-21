"use server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { AuthError, requestCode, verifyCode } from "@/server/auth-core";
import { mergeGuestFavs } from "@/server/guest-favs";
import { setSessionCookie } from "@/server/session";

export type Mode = "login" | "register";
export type LoginState = { step: "phone" | "code"; mode: Mode; phone: string; name: string; error?: string; next: string };

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const db = await getDb();
  const next = safeNext(String(form.get("next") ?? prev.next ?? "/"));
  const intent = String(form.get("intent") ?? "send");
  const mode: Mode = form.get("mode") === "register" ? "register" : prev.mode;
  try {
    if (intent === "send" || intent === "resend") {
      const name = String(form.get("name") ?? prev.name).trim().slice(0, 40);
      if (mode === "register" && intent === "send") {
        if (!name) return { ...prev, mode, next, name, phone: String(form.get("phone") ?? ""), error: "Как вас зовут? Имя увидят покупатели" };
        if (form.get("consent") !== "on") return { ...prev, mode, next, name, phone: String(form.get("phone") ?? ""), error: "Нужно согласие с правилами" };
      }
      const r = await requestCode(db, String(form.get("phone") ?? prev.phone));
      return { step: "code", mode, phone: r.phone, name, next };
    }
    if (intent === "change") return { ...prev, step: "phone", error: undefined, next };
    const s = await verifyCode(db, prev.phone, String(form.get("code") ?? ""));
    if (prev.name && !s.hasName) {
      await db.update(users).set({ name: prev.name }).where(and(eq(users.id, s.userId), eq(users.name, "")));
    }
    await setSessionCookie(s.token);
    await mergeGuestFavs(db, s.userId);
  } catch (e) {
    if (e instanceof AuthError) return { ...prev, next, error: e.message };
    throw e;
  }
  redirect(next);
}
