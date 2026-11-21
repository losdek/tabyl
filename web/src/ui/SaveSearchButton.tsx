"use client";
import { useState, useTransition } from "react";
import { saveSearchAction } from "@/app/actions";

export function SaveSearchButton({ query }: { query: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  if (saved) return <span className="shrink-0 text-sm text-mut">Сохранено — новые будут в профиле</span>;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => setSaved((await saveSearchAction(query)) === "saved"))}
      className="pseudo shrink-0 text-sm"
    >
      Сохранить поиск
    </button>
  );
}
