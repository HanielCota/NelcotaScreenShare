import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { redirect } from "@/server/http.server";
import { z } from "zod";
import { VerifyEmailPanel } from "@/features/auth/ui/VerifyEmailPanel";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { getUserSession } from "@/features/auth/server/participant-session.server";

export const meta = () => [{ title: "Confirme seu e-mail · Nelcota" }];

export const loader = routeLoader(async ({ searchParams }) => {
  const { voltar, email } = searchParams;
  const returnTo = safeReturnPath(voltar);
  const current = await getUserSession();
  if (current?.user.emailVerified) redirect(returnTo);
  // Logado sem confirmar: usa o e-mail da conta. Logo após o cadastro: o que a pessoa digitou.
  const typed = z.email().safeParse(email);
  const address = current?.user.email ?? (typed.success ? typed.data : undefined);

  return { returnTo, address };
});

export default function VerifyEmailPage() {
  const { returnTo, address } = useLoaderData<typeof loader>();
  return <VerifyEmailPanel email={address} returnTo={returnTo} />;
}
