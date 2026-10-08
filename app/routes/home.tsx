import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { HomeScene } from "@/features/home/ui/HomeScene";
import { getUserSession } from "@/features/auth/server/participant-session.server";
import { getEnv } from "@/server/env.server";

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
    maxParticipants: getEnv().MAX_PARTICIPANTS,
  };
});

export default function HomePage() {
  const { erro, aviso, account, maxParticipants } = useLoaderData<typeof loader>();
  return (
    <HomeScene
      invalidCode={erro === "codigo"}
      account={account}
      maxParticipants={maxParticipants}
      notice={typeof aviso === "string" ? NOTICES[aviso] : undefined}
    />
  );
}
