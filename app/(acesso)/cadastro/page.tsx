import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/features/auth/ui/SignUpForm";
import { accessContext } from "@/features/auth/domain/access-context";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { getUserSession } from "@/features/auth/server/participant-session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  const { voltar } = await searchParams;
  const returnTo = safeReturnPath(voltar);
  if (await getUserSession()) redirect(returnTo);
  return (
    <SignUpForm
      returnTo={returnTo}
      context={accessContext(returnTo)}
      verificationRequired={getEnv().REQUIRE_EMAIL_VERIFICATION}
    />
  );
}
