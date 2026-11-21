import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { endSession } from "@/server/auth-core";
import { SESSION_COOKIE } from "@/server/session";

/** POST only, so a link or prefetch can never sign someone out. */
export async function POST(req: Request) {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await endSession(await getDb(), t);
  jar.delete(SESSION_COOKIE);
  return Response.redirect(new URL("/", req.url), 303);
}
