"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { freedomConfig, initPayment } from "@/server/payments/freedom";
import { createOrder, isTier, markFailed, PromoError, setPending, TIERS } from "@/server/promo";
import { requireUser } from "@/server/session";

export async function payAction(adId: string, form: FormData) {
  const user = await requireUser(`/promote/${adId}`);
  const tier = String(form.get("tier") ?? "");
  if (!isTier(tier)) redirect(`/promote/${adId}?error=${encodeURIComponent("Выберите вариант")}`);
  const db = await getDb();
  const provider = freedomConfig() ? "freedom" : "stub";
  let target: string;
  try {
    const { order, ad } = await createOrder(db, user.id, adId, tier, provider);
    if (provider === "stub") {
      target = `/pay/stub/${order.id}`;
    } else {
      const h = await headers();
      const origin = process.env.TABYL_ORIGIN ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
      try {
        const p = await initPayment({ orderId: order.id, amount: order.amount, description: `${TIERS[tier].name}: ${ad.title}`, origin, phone: user.phone });
        await setPending(db, order.id, p.paymentId);
        target = p.redirectUrl;
      } catch (e) {
        console.error(e);
        await markFailed(db, order.id, { error: String(e) });
        target = `/promote/${adId}?error=${encodeURIComponent("Платёжная система не ответила. Попробуйте через минуту")}`;
      }
    }
  } catch (e) {
    if (e instanceof PromoError) target = `/promote/${adId}?error=${encodeURIComponent(e.message)}`;
    else throw e;
  }
  redirect(target);
}
