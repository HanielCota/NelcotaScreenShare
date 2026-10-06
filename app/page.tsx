import { HomeScene } from "@/components/home/HomeScene";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { erro } = await searchParams;

  return <HomeScene invalidCode={erro === "codigo"} />;
}
