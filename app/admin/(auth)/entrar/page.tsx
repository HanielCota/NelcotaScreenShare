import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/features/auth/ui/AdminSignInForm";
import { AdminDisabled } from "@/features/auth/ui/AdminDisabled";
import { getAdminAuth } from "@/features/auth/server/admin-auth";
import { getAdminSession } from "@/features/auth/server/admin-session";

const NOTICES: Record<string, string> = {
  convite: "Conta criada. Entre com seu e-mail e a senha que você escolheu.",
  senha: "Senha alterada. Entre com a nova senha.",
  saiu: "Você saiu do painel.",
};

export default async function AdminSignInPage({ searchParams }: PageProps<"/admin/entrar">) {
  if (!getAdminAuth()) return <AdminDisabled />;
  if (await getAdminSession()) redirect("/admin");
  const { aviso } = await searchParams;
  const notice = typeof aviso === "string" ? NOTICES[aviso] : undefined;
  return <AdminSignInForm notice={notice} />;
}
