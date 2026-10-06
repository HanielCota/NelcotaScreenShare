import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = { title: "Nova senha" };

/** O Better Auth redireciona para cá com ?token=… (ou ?error=INVALID_TOKEN). */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return <ResetPasswordForm scope="user" token={valid ? token : undefined} />;
}
