"use client";
import { useActionState } from "react";
import { CITIES } from "@/domain/places";
import { setThemeAction } from "../actions";
import { updateProfile } from "./actions";

const field = "h-12 w-full rounded-[12px] bg-field px-3.5 text-base outline-none focus:outline-2 focus:outline-fg";

export function ProfileForm({ name, city, theme }: { name: string; city: string; theme: string }) {
  const [msg, action, pending] = useActionState(updateProfile, "");
  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1">
          <span className="text-sm text-mut">Имя для объявлений</span>
          <input name="name" defaultValue={name} maxLength={40} placeholder="Как к вам обращаться" className={field} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-mut">Город</span>
          <select name="city" defaultValue={city} className={field}>
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <button disabled={pending} className="h-12 rounded-[12px] bg-ink px-6 font-medium text-on-ink">Сохранить</button>
        {msg && <p role="status" className={`text-sm sm:col-span-3 ${msg === "Сохранено" ? "text-ok" : "text-danger"}`}>{msg}</p>}
      </form>
      <fieldset className="grid gap-1">
        <legend className="mb-1 text-sm text-mut">Тема</legend>
        <div className="flex gap-5">
          {([["auto", "Как в системе"], ["light", "Светлая"], ["dark", "Тёмная"]] as const).map(([v, l]) => (
            <label key={v} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="theme"
                defaultChecked={theme === v}
                onChange={async () => {
                  await setThemeAction(v);
                  if (v === "auto") document.documentElement.removeAttribute("data-theme");
                  else document.documentElement.dataset.theme = v;
                }}
                className="size-5 accent-[var(--ink)]"
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
