import type { Metadata } from "next";
import { Header } from "@/ui/Header";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Персональные данные" };

export default async function Privacy() {
  return (
    <>
      <Header signedIn={!!(await currentUser())} />
      <main className="prose island mx-auto max-w-[70ch] px-5 pt-6 pb-10 md:px-8 text-[15px] leading-relaxed">
        <h1 className="mb-4 text-2xl font-medium">Персональные данные</h1>
        <p className="mb-3 rounded-[10px] bg-field px-3 py-2 text-sm">Черновик: текст нужно сверить с юристом по закону КР «Об информации персонального характера» перед запуском.</p>
        <p className="mb-3">Мы храним номер телефона (для входа и чтобы покупатели могли позвонить, когда вы этого хотите), имя, город, ваши объявления, переписку в чатах и отзывы.</p>
        <p className="mb-3">Номер показывается покупателю только после нажатия «Позвонить» и только вошедшим пользователям. Из фотографий удаляются метаданные, в том числе геолокация.</p>
        <p className="mb-3">Мы не продаём данные и не передаём их третьим лицам, кроме платёжной системы при оплате продвижения и случаев, предусмотренных законом.</p>
        <p className="mb-3">Удалить аккаунт и все данные можно по запросу в поддержку.</p>
      </main>
    </>
  );
}
