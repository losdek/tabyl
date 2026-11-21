"use client";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleFavoriteAction } from "@/app/actions";

export function FavButton({ adId, on, large = false }: { adId: string; on: boolean; large?: boolean }) {
  const [state, setState] = useOptimistic(on);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={state}
      aria-label={state ? "Убрать из избранного" : "В избранное"}
      onClick={() =>
        start(async () => {
          setState(!state);
          const res = await toggleFavoriteAction(adId);
          if (res === "login") router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        })
      }
      className={`-mr-2 grid place-items-center ${large ? "size-11 rounded-[12px] bg-bg/90" : "size-9"} ${state ? "text-fg" : "text-fg/70"}`}
    >
      <svg width={large ? 22 : 18} height={large ? 22 : 18} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"
          fill={state ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">{state ? "В избранном" : ""}</span>
    </button>
  );
}
