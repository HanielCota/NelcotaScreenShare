import { ResetPasswordForm } from "@/components/auth/PasswordForms";

/** O Better Auth redireciona para cá com ?token=… (ou ?error=INVALID_TOKEN). */
export default async function AdminResetPasswordPage({
  searchParams,
}: PageProps<"/admin/redefinir-senha">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return <ResetPasswordForm scope="admin" token={valid ? token : undefined} />;
}
