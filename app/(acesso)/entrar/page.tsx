import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/features/auth/ui/SignInForm";
import { accessContext } from "@/features/auth/domain/access-context";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { getUserSession } from "@/features/auth/server/participant-session";

export const metadata: Metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  senha: "Senha alterada. Entre com a nova senha.",
  saiu: "Você saiu da sua conta.",
  sessao: "Sua sessão expirou. Entre de novo para continuar.",
};

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const { voltar, aviso } = await searchParams;
  const returnTo = safeReturnPath(voltar);
  if (await getUserSession()) redirect(returnTo);
  return (
    <SignInForm
      returnTo={returnTo}
      context={accessContext(returnTo)}
      notice={typeof aviso === "string" ? NOTICES[aviso] : undefined}
    />
  );
}
