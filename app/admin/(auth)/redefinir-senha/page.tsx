import { AdminResetPasswordForm } from "@/components/admin/auth/AdminPasswordForms";

/** O Better Auth redireciona para cá com ?token=… (ou ?error=INVALID_TOKEN). */
export default async function AdminResetPasswordPage({
  searchParams,
}: PageProps<"/admin/redefinir-senha">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return <AdminResetPasswordForm token={valid ? token : undefined} />;
}
