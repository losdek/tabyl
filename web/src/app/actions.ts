"use server";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { toggleFavorite } from "@/server/ads";
import { toggleGuestFav } from "@/server/guest-favs";
import { currentUser } from "@/server/session";
import { isCity } from "@/domain/places";

export async function toggleFavoriteAction(adId: string): Promise<"on" | "off"> {
  const user = await currentUser();
  // visitors who have not signed in keep favourites in a cookie
  if (!user) return (await toggleGuestFav(adId)) ? "on" : "off";
  return (await toggleFavorite(await getDb(), user.id, adId)) ? "on" : "off";
}

export async function setThemeAction(theme: "light" | "dark" | "auto") {
  const jar = await cookies();
  if (theme === "auto") jar.delete("theme");
  else jar.set("theme", theme, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
}

export async function setCityAction(city: string) {
  if (city !== "all" && !isCity(city)) return;
  (await cookies()).set("city", city, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
}

export async function saveSearchAction(query: string): Promise<"saved" | "login"> {
  const user = await currentUser();
  if (!user) return "login";
  const { saveSearch } = await import("@/server/saved");
  await saveSearch(await getDb(), user.id, query);
  return "saved";
}
