import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { VerifyEmailPanel } from "@/components/account/VerifyEmailPanel";
import { safeReturnPath } from "@/lib/return-path";
import { getUserSession } from "@/server/auth/user-session";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verificar-email">) {
  const { voltar, email } = await searchParams;
  const returnTo = safeReturnPath(voltar);
  const current = await getUserSession();
  if (current?.user.emailVerified) redirect(returnTo);
  // Logado sem confirmar: usa o e-mail da conta. Logo após o cadastro: o que a pessoa digitou.
  const typed = z.email().safeParse(email);
  const address = current?.user.email ?? (typed.success ? typed.data : undefined);
  return <VerifyEmailPanel email={address} returnTo={returnTo} />;
}
