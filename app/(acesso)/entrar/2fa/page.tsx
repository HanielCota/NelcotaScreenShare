import type { Metadata } from "next";
import { TwoFactorCodeForm } from "@/components/auth/TwoFactorCodeForm";
import { safeReturnPath } from "@/lib/return-path";

export const metadata: Metadata = { title: "Verificação em duas etapas" };

export default async function SignInTwoFactorPage({ searchParams }: PageProps<"/entrar/2fa">) {
  const { voltar } = await searchParams;
  const returnTo = safeReturnPath(voltar);
  return (
    <TwoFactorCodeForm
      scope="user"
      doneHref={returnTo}
      backHref={`/entrar?voltar=${encodeURIComponent(returnTo)}`}
    />
  );
}
