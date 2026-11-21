import { SearchView } from "./SearchView";

export default async function Home(props: PageProps<"/">) {
  return <SearchView sp={await props.searchParams} mode="home" />;
}
