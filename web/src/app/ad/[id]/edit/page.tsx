import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getAd } from "@/server/ads";
import { requireUser } from "@/server/session";
import { Icon } from "@/ui/icons";
import { AdForm } from "../../../post/AdForm";

export const metadata: Metadata = { title: "Редактирование", robots: { index: false } };

export default async function EditPage(props: PageProps<"/ad/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireUser(`/ad/${id}/edit`);
  const data = await getAd(await getDb(), id);
  if (!data || data.ad.userId !== user.id) notFound();
  const { ad, photos } = data;
  const attrs: Record<string, string | boolean> = {};
  for (const [k, val] of Object.entries(ad.attrs)) attrs[k] = typeof val === "boolean" ? val : String(val);
  return (
    <main className="mx-auto max-w-2xl px-4 pt-3 pb-10">
      <div className="mb-5 flex items-center gap-2">
        <Link href={`/ad/${id}`} aria-label="Назад" className="-ml-2 grid size-11 place-items-center"><Icon name="back" /></Link>
        <h1 className="text-xl font-medium">Редактирование</h1>
      </div>
      <AdForm
        adId={id}
        initial={{
          category: ad.category, title: ad.title, description: ad.description,
          price: ad.price && ad.price > 0 ? String(ad.price) : "",
          priceMode: ad.price === null ? "deal" : ad.price === 0 ? "free" : "price",
          currency: ad.currency, negotiable: ad.negotiable, condition: ad.condition ?? "", city: ad.city, district: ad.district,
          attrs, photos: photos.map((p) => ({ id: p.id, width: p.width, height: p.height, blur: p.blur })),
        }}
      />
    </main>
  );
}
