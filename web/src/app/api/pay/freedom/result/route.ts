import { getDb } from "@/db/client";
import { freedomConfig, okXml, verify, type Params } from "@/server/payments/freedom";
import { getOrder, markFailed, markPaid } from "@/server/promo";

const xml = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "application/xml; charset=utf-8" } });

/** Freedom Pay result callback. Signed with script name «result» (last URL segment). */
export async function POST(req: Request) {
  const cfg = freedomConfig();
  if (!cfg) return xml(okXml("rejected", "not configured"), 404);
  const url = new URL(req.url);
  const form = await req.formData();
  const params: Params = { ...Object.fromEntries(url.searchParams) };
  for (const [k, v] of form) if (typeof v === "string") params[k] = v;
  if (!verify("result", params, cfg.secret)) return xml(okXml("rejected", "bad signature"), 400);

  const db = await getDb();
  const order = await getOrder(db, String(params.pg_order_id));
  if (!order) return xml(okXml("rejected", "unknown order"));
  if (Number(params.pg_amount) < order.amount) return xml(okXml("rejected", "amount mismatch"));
  const raw = Object.fromEntries(Object.entries(params).filter(([k]) => !/card_(pan|exp|owner|token)/.test(k)));
  if (params.pg_result === "1") await markPaid(db, order.id, String(params.pg_payment_id), raw);
  else if (params.pg_result === "0") await markFailed(db, order.id, raw);
  return xml(okXml("ok"));
}
