import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/ui/Header";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Правила" };

export default async function Rules() {
  return (
    <>
      <Header signedIn={!!(await currentUser())} />
      <main className="prose mx-auto max-w-[65ch] px-4 pt-6 pb-16 text-[15px] leading-relaxed">
        <h1 className="mb-4 text-2xl font-medium">Правила Табыла</h1>
        <p className="mb-3">Коротко: продавайте своё, пишите правду, не обманывайте. Объявления публикуются сразу, а модераторы проверяют их по жалобам и автоматическим сигналам.</p>
        <h2 className="mt-6 mb-2 text-lg font-medium">Нельзя</h2>
        <ul className="mb-3 list-disc pl-5">
          <li>оружие, наркотики, поддельные документы, лекарства по рецепту;</li>
          <li>чужие фото и чужие объявления;</li>
          <li>одно и то же объявление несколько раз — для этого есть «Поднять в ленте»;</li>
          <li>номер телефона и ссылки в тексте объявления — для связи есть кнопки;</li>
          <li>оскорбления в чатах и отзывах.</li>
        </ul>
        <h2 className="mt-6 mb-2 text-lg font-medium">Как не попасться мошенникам</h2>
        <ul className="mb-3 list-disc pl-5">
          <li>не переводите предоплату незнакомым людям;</li>
          <li>Табыл никогда не присылает ссылки на оплату и не просит код из СМС;</li>
          <li>встречайтесь в людных местах и проверяйте товар до оплаты.</li>
        </ul>
        <p className="mt-6">Нашли нарушение — нажмите «Пожаловаться» на странице объявления. <Link href="/privacy">Как мы храним данные</Link>.</p>
      </main>
    </>
  );
}
