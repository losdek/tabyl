"use client";
import { useActionState } from "react";
import { reportAd } from "./actions";

const REASONS = ["Мошенничество", "Товар продан", "Неверная цена", "Запрещённый товар", "Дубликат", "Оскорбления", "Другое"];

export function ReportForm({ adId }: { adId: string }) {
  const [msg, action, pending] = useActionState(async (_: string, f: FormData) => reportAd(adId, f), "");
  return (
    <details className="text-sm">
      <summary className="pseudo inline cursor-pointer list-none text-mut [&::-webkit-details-marker]:hidden">Пожаловаться</summary>
      {msg === "Спасибо, модератор посмотрит" ? (
        <p role="status" className="mt-3">{msg}</p>
      ) : (
        <form action={action} className="mt-3 grid max-w-sm gap-2">
          <fieldset className="grid gap-1">
            <legend className="sr-only">Причина</legend>
            {REASONS.map((r) => (
              <label key={r} className="flex min-h-9 items-center gap-2">
                <input type="radio" name="reason" value={r} className="size-4 accent-[var(--ink)]" /> {r}
              </label>
            ))}
          </fieldset>
          <textarea name="note" rows={2} maxLength={500} placeholder="Что не так? (необязательно)" className="rounded-[10px] bg-field p-3 text-base outline-none" />
          <button disabled={pending} className="h-11 justify-self-start rounded-[12px] bg-ink px-5 font-medium text-on-ink">Отправить</button>
          {msg && <p role="alert" className="text-danger">{msg}</p>}
        </form>
      )}
    </details>
  );
}
