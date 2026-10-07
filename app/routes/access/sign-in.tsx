import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { redirect } from "@/server/http.server";
import { SignInForm } from "@/features/auth/ui/SignInForm";
import { accessContext } from "@/features/auth/domain/access-context";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { getUserSession } from "@/features/auth/server/participant-session.server";

export const meta = () => [{ title: "Entrar · Nelcota" }];

const NOTICES: Record<string, string> = {
  senha: "Senha alterada. Entre com a nova senha.",
  saiu: "Você saiu da sua conta.",
  sessao: "Sua sessão expirou. Entre de novo para continuar.",
};

export const loader = routeLoader(async ({ searchParams }) => {
  const { voltar, aviso } = searchParams;
  const returnTo = safeReturnPath(voltar);
  if (await getUserSession()) redirect(returnTo);

  return { aviso, returnTo };
});

export default function SignInPage() {
  const { aviso, returnTo } = useLoaderData<typeof loader>();
  return (
    <SignInForm
      returnTo={returnTo}
      context={accessContext(returnTo)}
      notice={typeof aviso === "string" ? NOTICES[aviso] : undefined}
    />
  );
}
