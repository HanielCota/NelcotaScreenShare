import { HomeScene } from "@/components/home/HomeScene";
import { getUserSession } from "@/server/auth/user-session";

const NOTICES: Record<string, string> = {
  "conta-excluida": "Sua conta foi excluída. Obrigado por usar o Nelcota.",
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { erro, aviso } = await searchParams;
  const current = await getUserSession();

  return (
    <HomeScene
      invalidCode={erro === "codigo"}
      account={current ? { name: current.user.name } : null}
      notice={typeof aviso === "string" ? NOTICES[aviso] : undefined}
    />
  );
}
