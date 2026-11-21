"use server";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { isCity } from "@/domain/places";
import { deleteSearch } from "@/server/saved";
import { requireUser } from "@/server/session";

export async function updateProfile(_: string, form: FormData): Promise<string> {
  const user = await requireUser("/profile");
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const city = String(form.get("city") ?? "");
  if (!name) return "Укажите имя — его видят покупатели";
  if (!isCity(city)) return "Выберите город";
  await (await getDb()).update(users).set({ name, city }).where(eq(users.id, user.id));
  (await cookies()).set("city", city, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  refresh();
  return "Сохранено";
}

export async function removeSavedSearch(id: string) {
  const user = await requireUser("/profile");
  await deleteSearch(await getDb(), user.id, id);
  refresh();
}
