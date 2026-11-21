import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { isCity } from "@/domain/places";
import { requireUser } from "@/server/session";
import { Icon } from "@/ui/icons";
import { AdForm } from "./AdForm";

export const metadata: Metadata = { title: "Новое объявление", robots: { index: false } };

export default async function PostPage() {
  const user = await requireUser("/post");
  const cookieCity = (await cookies()).get("city")?.value ?? "";
  const city = isCity(user.city) ? user.city : isCity(cookieCity) ? cookieCity : "bishkek";
  return (
    <main className="mx-auto max-w-2xl px-4 pt-3 pb-10">
      <div className="mb-5 flex items-center gap-2">
        <Link href="/" aria-label="Закрыть" className="-ml-2 grid size-11 place-items-center"><Icon name="close" /></Link>
        <h1 className="text-xl font-medium">Новое объявление</h1>
      </div>
      <AdForm
        adId={null}
        initial={{ category: "", title: "", description: "", price: "", priceMode: "price", currency: "KGS", negotiable: false, condition: "", city, district: "", attrs: {}, photos: [] }}
      />
    </main>
  );
}
