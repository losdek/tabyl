import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryBySlug } from "@/domain/categories";
import { SearchView } from "../../SearchView";

export async function generateMetadata(props: PageProps<"/c/[category]">): Promise<Metadata> {
  const cat = categoryBySlug((await props.params).category);
  return cat ? { title: `${cat.name} — объявления в Кыргызстане` } : {};
}

export default async function CategoryPage(props: PageProps<"/c/[category]">) {
  const { category } = await props.params;
  if (!categoryBySlug(category)) notFound();
  return <SearchView sp={await props.searchParams} mode="category" category={category} />;
}
