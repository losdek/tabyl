import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import { SESSION_DAYS, userForToken, type User } from "./auth-core";

export const SESSION_COOKIE = "tabyl_s";

/** Current user from the web cookie or an app bearer token; cached per request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const db = await getDb();
  const jar = await cookies();
  const fromCookie = jar.get(SESSION_COOKIE)?.value;
  if (fromCookie) return userForToken(db, fromCookie);
  const auth = (await headers()).get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return userForToken(db, bearer);
});

export async function requireUser(next = "/"): Promise<User> {
  const u = await currentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser("/admin");
  if (u.role !== "admin") redirect("/");
  return u;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
