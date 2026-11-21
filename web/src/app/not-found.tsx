import Link from "next/link";
import { Logo } from "@/ui/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[70dvh] max-w-sm content-center justify-items-center gap-3 px-4 text-center">
      <Link href="/" aria-label="На главную"><Logo className="h-7 w-auto" /></Link>
      <h1 className="mt-6 text-2xl font-medium">Здесь ничего нет</h1>
      <p className="text-mut">Объявление могли продать или удалить. Похожее наверняка найдётся.</p>
      <Link href="/" className="link mt-2">К свежим объявлениям</Link>
    </main>
  );
}
