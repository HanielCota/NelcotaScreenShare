import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/account/SignUpForm";
import { accessContext } from "@/lib/access-context";
import { getUserSession, safeReturnPath } from "@/server/auth/user-session";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  const { voltar } = await searchParams;
  const returnTo = safeReturnPath(voltar);
  if (await getUserSession()) redirect(returnTo);
  return <SignUpForm returnTo={returnTo} context={accessContext(returnTo)} />;
}
