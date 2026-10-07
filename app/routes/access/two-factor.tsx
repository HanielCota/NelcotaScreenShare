import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { TwoFactorCodeForm } from "@/features/auth/ui/TwoFactorCodeForm";
import { safeReturnPath } from "@/features/auth/domain/return-path";

export const meta = () => [{ title: "Verificação em duas etapas · Nelcota" }];

export const loader = routeLoader(async ({ searchParams }) => {
  const { voltar } = searchParams;
  const returnTo = safeReturnPath(voltar);

  return { returnTo };
});

export default function SignInTwoFactorPage() {
  const { returnTo } = useLoaderData<typeof loader>();
  return (
    <TwoFactorCodeForm
      scope="user"
      doneHref={returnTo}
      backHref={`/entrar?voltar=${encodeURIComponent(returnTo)}`}
    />
  );
}
