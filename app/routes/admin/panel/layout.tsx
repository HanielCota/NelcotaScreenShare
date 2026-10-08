import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData, Outlet } from "react-router";
import { readCookie } from "@/server/request-context.server";

import { AdminShell } from "@/features/admin/shell/ui/AdminShell";
import { navFor } from "@/features/admin/shell/server/nav.server";
import { needsTwoFactorSetup, requireAdmin } from "@/features/auth/server/admin-session.server";
import { ADMIN_ROLE_LABELS } from "@/features/auth/domain/roles";

// Without mandatory 2FA, the other screens redirect to the security one:
// the menu shows only what can be opened (redirecting links become a prefetch loop).
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
 * Admin panel shell: only requires an admin session. Mandatory 2FA and permissions
 * are enforced by EACH page loader (`requireAdmin`). Loaders run in
 * parallel: the layout's authorization does not protect its children's data.
 * A test ensures every panel page calls `requireAdmin`.
 */
export const loader = routeLoader(async ({ request }) => {
  const admin = await requireAdmin(undefined, { allowWithoutTwoFactor: true });
  // Sidebar open/collapsed: remembered in a cookie by the component itself.
  const sidebar = readCookie(request.headers, "sidebar_state");

  const groups = needsTwoFactorSetup(admin) ? SETUP_ONLY_NAV : navFor(admin.user.role);
  return { admin: { user: admin.user }, sidebar, groups };
});

export default function AdminPanelLayout() {
  const { admin, sidebar, groups } = useLoaderData<typeof loader>();
  return (
    <AdminShell
      user={{
        name: admin.user.name,
        email: admin.user.email,
        roleLabel: ADMIN_ROLE_LABELS[admin.user.role],
      }}
      groups={groups}
      defaultOpen={sidebar !== "false"}
    >
      <Outlet />
    </AdminShell>
  );
}

export { AdminErrorBoundary as ErrorBoundary } from "@/features/admin/shell/ui/AdminErrorBoundary";
