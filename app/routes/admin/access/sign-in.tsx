import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { redirect } from "@/server/http.server";
import { AdminSignInForm } from "@/features/auth/ui/AdminSignInForm";
import { AdminDisabled } from "@/features/auth/ui/AdminDisabled";
import { getAdminAuth } from "@/features/auth/server/admin-auth.server";
import { getAdminSession } from "@/features/auth/server/admin-session.server";

const NOTICES: Record<string, string> = {
  convite: "Conta criada. Entre com seu e-mail e a senha que você escolheu.",
  senha: "Senha alterada. Entre com a nova senha.",
  saiu: "Você saiu do painel.",
};

export const loader = routeLoader(async ({ searchParams }) => {
  if (!getAdminAuth()) return { disabled: true, notice: undefined };
  if (await getAdminSession()) redirect("/admin");
  const { aviso } = searchParams;
  const notice = typeof aviso === "string" ? NOTICES[aviso] : undefined;

  return { notice, disabled: false };
});

export default function AdminSignInPage() {
  const { notice, disabled } = useLoaderData<typeof loader>();
  if (disabled) return <AdminDisabled />;
  return <AdminSignInForm notice={notice} />;
}
