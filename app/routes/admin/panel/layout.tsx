import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData, Outlet } from "react-router";
import { readCookie } from "@/server/request-context.server";

import { AdminShell } from "@/features/admin/shell/ui/AdminShell";
import { navFor } from "@/features/admin/shell/server/nav.server";
import { needsTwoFactorSetup, requireAdmin } from "@/features/auth/server/admin-session.server";
import { ADMIN_ROLE_LABELS } from "@/features/auth/domain/roles";

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

export const meta = () => [{ title: "Admin · Nelcota" }];

/**
 * Shell do painel: só exige sessão de admin. O 2FA obrigatório e as permissões
 * são aplicados por CADA loader de página (`requireAdmin`). Loaders rodam em
 * paralelo: a autorização do layout não protege os dados de seus filhos.
 * Um teste garante que toda página do painel chama `requireAdmin`.
 */
export const loader = routeLoader(async ({ request }) => {
  const admin = await requireAdmin(undefined, { allowWithoutTwoFactor: true });
  // Sidebar aberta/recolhida: lembrada em cookie pelo próprio componente.
  const sidebar = readCookie(request.headers, "sidebar_state");

  const groups = needsTwoFactorSetup(admin) ? SETUP_ONLY_NAV : navFor(admin.user.role);
  return { admin: { user: admin.user }, sidebar, groups };
});

export default function AdminPanelLayout() {
  const { admin, sidebar, groups } = useLoaderData<typeof loader>();
  const children = <Outlet />;
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
      groups={groups}
      defaultOpen={sidebar !== "false"}
    >
      {children}
    </AdminShell>
  );
}

export { AdminErrorBoundary as ErrorBoundary } from "@/features/admin/shell/ui/AdminErrorBoundary";
