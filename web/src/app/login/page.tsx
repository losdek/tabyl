import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/session";
import { Logo } from "@/ui/Logo";
import { BackButton } from "./BackButton";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вход и регистрация", robots: { index: false } };

const ERRORS: Record<string, string> = {
  google: "Не удалось войти через Google. Попробуйте ещё раз",
  google_off: "Вход через Google пока не работает. Войдите по номеру телефона",
  banned: "Аккаунт заблокирован модератором",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  if (await currentUser()) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-4 pt-2 pb-8">
      <div className="flex items-center justify-between">
        <BackButton fallback={next} />
        <Link href="/" aria-label="Табыл — на главную"><Logo className="h-[22px] w-auto" /></Link>
      </div>
      <div className="mt-8">
        {error && <p role="alert" className="animate-rise mb-4 rounded-[10px] bg-field px-3 py-2.5 text-sm">{error}</p>}
        <LoginForm next={next} initialMode={sp.mode === "register" ? "register" : "login"} />
      </div>
    </main>
  );
}
