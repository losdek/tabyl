"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/ui/icons";

/** Goes back where the visitor came from; falls back to the home page. */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ml-2 flex h-11 items-center gap-1 pr-3 text-[15px] transition active:scale-95"
    >
      <Icon name="back" />
      Назад
    </button>
  );
}
