"use client";
import { useState, useTransition } from "react";
import { formatPhone } from "@/lib/format";
import { Icon } from "@/ui/icons";
import { revealPhone, writeToSeller } from "./actions";

/** Sticky on phones: call, WhatsApp, and the main action «Написать». */
export function ContactBar({ adId, hasPhone }: { adId: string; hasPhone: boolean }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reveal = (then?: (p: string) => void) =>
    start(async () => {
      const r = await revealPhone(adId);
      if ("login" in r) location.href = `/login?next=/ad/${adId}`;
      else if ("phone" in r) {
        setPhone(r.phone);
        then?.(r.phone);
      }
    });

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),14px)] md:static md:border-0 md:bg-transparent md:p-0">
      {phone && (
        <p className="mb-2 text-center text-sm md:text-left">
          <a href={`tel:${phone}`} className="link num text-base font-medium">{formatPhone(phone)}</a>
          <span className="ml-2 text-mut">скажите, что нашли на Табыле</span>
        </p>
      )}
      <div className="grid grid-cols-[52px_52px_1fr] gap-2">
        {hasPhone ? (
          <>
            <button
              type="button"
              aria-label="Позвонить"
              disabled={pending}
              onClick={() => (phone ? (location.href = `tel:${phone}`) : reveal((p) => (location.href = `tel:${p}`)))}
              className="grid h-[52px] place-items-center rounded-[12px] bg-field"
            >
              <Icon name="phone" />
            </button>
            <button
              type="button"
              aria-label="Написать в WhatsApp"
              disabled={pending}
              onClick={() => {
                const open = (p: string) => window.open(`https://wa.me/${p.replace("+", "")}`, "_blank", "noopener");
                if (phone) open(phone);
                else reveal(open);
              }}
              className="grid h-[52px] place-items-center rounded-[12px] bg-field"
            >
              <Icon name="wa" />
            </button>
          </>
        ) : (
          <span className="col-span-2" />
        )}
        <form action={writeToSeller.bind(null, adId)}>
          <button className="h-[52px] w-full rounded-[12px] bg-ink text-base font-medium text-on-ink">Написать</button>
        </form>
      </div>
    </div>
  );
}
