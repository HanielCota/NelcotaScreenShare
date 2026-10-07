import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { HomeScene } from "@/features/home/ui/HomeScene";
import { getUserSession } from "@/features/auth/server/participant-session.server";

const NOTICES: Record<string, string> = {
  "conta-excluida": "Sua conta foi excluída. Obrigado por usar o Nelcota.",
};

export const loader = routeLoader(async ({ searchParams }) => {
  const { erro, aviso } = searchParams;
  const current = await getUserSession();

  return {
    erro,
    aviso,
    account: current ? { name: current.user.name, image: current.user.image } : null,
  };
});

export default function HomePage() {
  const { erro, aviso, account } = useLoaderData<typeof loader>();
  return (
    <HomeScene
      invalidCode={erro === "codigo"}
      account={account}
      notice={typeof aviso === "string" ? NOTICES[aviso] : undefined}
    />
  );
}
