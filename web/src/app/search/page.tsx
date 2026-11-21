import type { Metadata } from "next";
import { SearchView } from "../SearchView";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const { q } = await props.searchParams;
  return { title: typeof q === "string" && q ? `«${q}» — поиск` : "Поиск", robots: { index: false } };
}

export default async function SearchPage(props: PageProps<"/search">) {
  return <SearchView sp={await props.searchParams} mode="search" />;
}
