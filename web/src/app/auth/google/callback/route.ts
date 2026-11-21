import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { AuthError, createSession, userForGoogle } from "@/server/auth-core";
import { google, googleEnabled } from "@/server/google";
import { mergeGuestFavs } from "@/server/guest-favs";
import { currentUser, setSessionCookie } from "@/server/session";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!googleEnabled()) return Response.redirect(`${origin}/login`, 302);
  const url = new URL(req.url);
  const jar = await cookies();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const next = jar.get("g_next")?.value ?? "/";
  if (!code || !state || state !== jar.get("g_state")?.value) return Response.redirect(`${origin}/login?error=google`, 302);
  try {
    const tokens = await google().validateAuthorizationCode(code, jar.get("g_verifier")?.value ?? "");
    const claims = decodeIdToken(tokens.idToken()) as { sub: string; email?: string; name?: string };
    const db = await getDb();
    const user = await userForGoogle(db, claims, await currentUser());
    const s = await createSession(db, user.id);
    await setSessionCookie(s.token);
    await mergeGuestFavs(db, user.id);
  } catch (e) {
    return Response.redirect(`${origin}/login?error=${e instanceof AuthError && e.code === "banned" ? "banned" : "google"}`, 302);
  } finally {
    jar.delete("g_state");
    jar.delete("g_verifier");
    jar.delete("g_next");
  }
  return Response.redirect(`${origin}${next}`, 302);
}
