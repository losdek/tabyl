import { HomeView } from "./HomeView";

export default async function Home(props: PageProps<"/">) {
  return <HomeView sp={await props.searchParams} />;
}
