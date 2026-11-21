/**
 * Freedom Pay (ex-PayBox) for Kyrgyzstan: init_payment + result callback.
 * Signature: md5 of "<script>;<values sorted by param name>;<secret>".
 * Docs: docs.freedompay.kz (Merchant API), host api.freedompay.kg.
 */
import { createHash, randomBytes } from "node:crypto";

export interface Params {
  [key: string]: string | number | Params | undefined;
}

/** Flatten values in key order; nested objects take their parent's place. */
function values(p: Params): string[] {
  return Object.keys(p)
    .filter((k) => k !== "pg_sig" && p[k] !== undefined)
    .sort()
    .flatMap((k) => {
      const v = p[k]!;
      return typeof v === "object" ? values(v) : [String(v)];
    });
}

export function sign(script: string, params: Params, secret: string): string {
  return createHash("md5").update([script, ...values(params), secret].join(";")).digest("hex");
}

export function verify(script: string, params: Params, secret: string): boolean {
  const got = String(params.pg_sig ?? "");
  return got.length === 32 && got === sign(script, params, secret);
}

export const freedomConfig = () =>
  process.env.FREEDOM_MERCHANT_ID && process.env.FREEDOM_SECRET
    ? {
        merchantId: process.env.FREEDOM_MERCHANT_ID,
        secret: process.env.FREEDOM_SECRET,
        base: process.env.FREEDOM_API ?? "https://api.freedompay.kg",
        testing: process.env.FREEDOM_TESTING !== "0",
      }
    : null;

const tag = (xml: string, name: string) => new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml)?.[1];

export async function initPayment(o: {
  orderId: string;
  amount: number;
  description: string;
  origin: string;
  phone?: string | null;
}): Promise<{ paymentId: string; redirectUrl: string }> {
  const cfg = freedomConfig();
  if (!cfg) throw new Error("freedom_not_configured");
  const script = "init_payment.php";
  const p: Params = {
    pg_merchant_id: cfg.merchantId,
    pg_order_id: o.orderId,
    pg_amount: o.amount.toFixed(2),
    pg_currency: "KGS",
    pg_description: o.description.slice(0, 1024),
    pg_salt: randomBytes(8).toString("hex"),
    pg_language: "ru",
    pg_testing_mode: cfg.testing ? "1" : "0",
    pg_result_url: `${o.origin}/api/pay/freedom/result`,
    pg_success_url: `${o.origin}/pay/return?order=${o.orderId}`,
    pg_failure_url: `${o.origin}/pay/return?order=${o.orderId}&failed=1`,
    pg_user_phone: o.phone?.replace("+", "") ?? undefined,
  };
  p.pg_sig = sign(script, p, cfg.secret);
  const body = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined) as [string, string][]);
  const res = await fetch(`${cfg.base}/${script}`, { method: "POST", body, signal: AbortSignal.timeout(15_000) });
  const xml = await res.text();
  if (tag(xml, "pg_status") !== "ok") throw new Error(`freedom_init: ${tag(xml, "pg_error_description") ?? xml.slice(0, 200)}`);
  const fields: Params = {};
  for (const m of xml.matchAll(/<(pg_[a-z_]+)>([^<]*)<\/\1>/g)) fields[m[1]] = m[2];
  if (!verify(script, fields, cfg.secret)) throw new Error("freedom_init: bad response signature");
  return { paymentId: String(fields.pg_payment_id), redirectUrl: String(fields.pg_redirect_url).replace(/&amp;/g, "&") };
}

export const okXml = (status: "ok" | "rejected" = "ok", description = "") =>
  `<?xml version="1.0" encoding="utf-8"?><response><pg_status>${status}</pg_status>${description ? `<pg_description>${description}</pg_description>` : ""}</response>`;
