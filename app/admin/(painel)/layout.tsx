import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/shell/ui/AdminShell";
import { navFor } from "@/features/admin/shell/nav";
import { needsTwoFactorSetup, requireAdmin } from "@/server/auth/admin-session";
import { ADMIN_ROLE_LABELS } from "@/server/auth/roles";

const SETUP_ONLY_NAV = [
  {
    label: "Minha conta",
    items: [
      {
        href: "/admin/conta/seguranca",
        label: "Segurança",
        icon: "security" as const,
        keywords: [],
      },
    ],
  },
];

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin Nelcota" } };

/**
 * Shell do painel: só exige sessão de admin. O 2FA obrigatório e as permissões
 * são aplicados por CADA página (`requireAdmin`), não aqui: um redirect num
 * layout compartilhado, que o Next não re-renderiza na navegação seguinte,
 * deixa o roteador pedindo a página em laço. Um teste garante que toda página
 * do painel chama `requireAdmin`.
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin(undefined, { allowWithoutTwoFactor: true });
  // Sidebar aberta/recolhida: lembrada em cookie pelo próprio componente.
  const sidebar = (await cookies()).get("sidebar_state")?.value;

  return (
    <AdminShell
      user={{
        name: admin.user.name,
        email: admin.user.email,
        roleLabel:
          (ADMIN_ROLE_LABELS as Record<string, string>)[admin.user.role] ?? admin.user.role,
      }}
      // Sem o 2FA obrigatório, as outras telas redirecionam para a de segurança:
      // o menu mostra só o que dá para abrir (links que redirecionam viram laço de prefetch).
      groups={needsTwoFactorSetup(admin) ? SETUP_ONLY_NAV : navFor(admin.user.role)}
      defaultOpen={sidebar !== "false"}
    >
      {children}
    </AdminShell>
  );
}
