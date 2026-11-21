import { devLastCodes } from "@/server/auth-core";
import { normalizePhone } from "@/lib/format";

/** End-to-end tests read the sign-in code here. Exists only when TABYL_E2E=1. */
export async function GET(req: Request) {
  if (process.env.TABYL_E2E !== "1") return new Response("Not found", { status: 404 });
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone") ?? "");
  const code = phone ? devLastCodes.get(phone) : undefined;
  return code ? Response.json({ code }) : new Response("No code", { status: 404 });
}
