import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/server/session";
import { googleEnabled } from "@/server/google";
import { Logo } from "@/ui/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вход", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  if (await currentUser()) redirect(next);
  const error = sp.error === "google" ? "Не удалось войти через Google. Попробуйте ещё раз" : sp.error === "banned" ? "Аккаунт заблокирован модератором" : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-4 pt-6 pb-10">
      <Link href="/" aria-label="Табыл — на главную" className="self-start">
        <Logo className="h-6 w-auto" />
      </Link>
      <h1 className="mt-10 text-2xl font-medium tracking-tight">Вход</h1>
      <p className="mt-1 mb-6 text-sm text-mut">Чтобы писать продавцам, сохранять объявления и подавать свои.</p>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <LoginForm next={next} google={googleEnabled()} />
      <p className="mt-auto pt-10 text-xs text-mut">
        Входя, вы соглашаетесь с <Link href="/rules" className="link">правилами Табыла</Link> и{" "}
        <Link href="/privacy" className="link">обработкой персональных данных</Link>.
      </p>
    </main>
  );
}
