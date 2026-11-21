import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { google, googleEnabled } from "@/server/google";

export async function GET(req: Request) {
  if (!googleEnabled()) return new Response("Google sign-in is not configured", { status: 404 });
  const next = new URL(req.url).searchParams.get("next") ?? "/";
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = google().createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  jar.set("g_state", state, opts);
  jar.set("g_verifier", verifier, opts);
  jar.set("g_next", next.startsWith("/") && !next.startsWith("//") ? next : "/", opts);
  return Response.redirect(url, 302);
}
