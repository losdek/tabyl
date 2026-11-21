"use client";
import { useActionState, useState } from "react";
import { replyAction, reviewAction } from "./actions";

export function ReviewForm({ sellerId }: { sellerId: string }) {
  const [rating, setRating] = useState(0);
  const [msg, action, pending] = useActionState(reviewAction.bind(null, sellerId), "");
  if (msg === "ok") return <p role="status" className="mb-6 text-sm text-ok">Спасибо за отзыв</p>;
  return (
    <form action={action} className="mb-8 grid gap-3 rounded-[12px] bg-field p-4">
      <p className="font-medium">Как прошла сделка?</p>
      <div role="radiogroup" aria-label="Оценка" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="grid size-11 cursor-pointer place-items-center text-2xl">
            <input type="radio" name="rating" value={n} className="sr-only" onChange={() => setRating(n)} />
            <span aria-hidden="true" className={n <= rating ? "text-fg" : "text-mut/50"}>★</span>
            <span className="sr-only">{n} из 5</span>
          </label>
        ))}
      </div>
      <textarea name="text" rows={3} maxLength={1000} placeholder="Что понравилось или нет (необязательно)" className="rounded-[10px] bg-bg p-3 text-base outline-none" />
      <button disabled={pending || !rating} className="h-11 justify-self-start rounded-[12px] bg-ink px-5 font-medium text-on-ink disabled:opacity-50">Оставить отзыв</button>
      {msg && <p role="alert" className="text-sm text-danger">{msg}</p>}
    </form>
  );
}

export function ReplyForm({ reviewId }: { reviewId: string }) {
  const [msg, action, pending] = useActionState(replyAction.bind(null, reviewId), "");
  if (msg === "ok") return null;
  return (
    <details className="mt-2 text-sm">
      <summary className="pseudo inline cursor-pointer list-none [&::-webkit-details-marker]:hidden">Ответить</summary>
      <form action={action} className="mt-2 grid gap-2">
        <textarea name="reply" rows={2} maxLength={1000} required className="rounded-[10px] bg-field p-3 text-base outline-none" />
        <button disabled={pending} className="h-10 justify-self-start rounded-[12px] bg-ink px-4 font-medium text-on-ink">Ответить</button>
        {msg && <p role="alert" className="text-danger">{msg}</p>}
      </form>
    </details>
  );
}
