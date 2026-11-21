import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { savedSearches } from "@/db/schema";
import { markSearchSeen } from "@/server/saved";
import { currentUser } from "@/server/session";

/** Open a saved search: resets its «new» counter, then shows the results. */
export async function GET(req: Request, ctx: RouteContext<"/saved/[id]">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return Response.redirect(new URL("/login?next=/profile", req.url), 302);
  const db = await getDb();
  const [s] = await db.select().from(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)));
  if (!s) return Response.redirect(new URL("/profile", req.url), 302);
  await markSearchSeen(db, user.id, id);
  return Response.redirect(new URL(`/search?${new URLSearchParams(s.query)}`, req.url), 302);
}
