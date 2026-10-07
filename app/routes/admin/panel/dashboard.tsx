import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData, Link } from "react-router";

import { KeyRound, MonitorSmartphone, Settings2 } from "lucide-react";
import { requireAdmin } from "@/features/auth/server/admin-session.server";
import { can } from "@/features/auth/server/permissions.server";

export const loader = routeLoader(async () => {
  const admin = await requireAdmin({ dashboard: ["read"] });
  const firstName = admin.user.name.split(" ")[0];
  const mayReadSettings = can(admin.user.role, { settings: ["read"] });

  return { firstName, mayReadSettings };
});

export default function AdminHomePage() {
  const { firstName, mayReadSettings } = useLoaderData<typeof loader>();
  const links = [
    mayReadSettings
      ? {
          href: "/admin/configuracoes",
          icon: Settings2,
          title: "Configurações",
          text: "Saturação do mascote e ajustes do app.",
        }
      : null,
    {
      href: "/admin/conta/seguranca",
      icon: KeyRound,
      title: "Segurança da conta",
      text: "Verificação em duas etapas e códigos de backup.",
    },
    {
      href: "/admin/conta/sessoes",
      icon: MonitorSmartphone,
      title: "Sessões ativas",
      text: "Onde sua conta está conectada agora.",
    },
  ].filter((link) => link !== null);
  return (
    <>
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Olá, {firstName}</h1>
        <p className="mt-1 text-ink-muted">Escolha uma área do painel para começar.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              to={href}
              className="glass flex h-full flex-col gap-3 rounded-2xl p-5 transition-colors hover:bg-surface-2/80"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-surface-2">
                <Icon className="size-5 text-brand-soft" aria-hidden="true" />
              </span>
              <span className="font-medium">{title}</span>
              <span className="text-sm text-ink-muted">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export { AdminErrorBoundary as ErrorBoundary } from "@/features/admin/shell/ui/AdminErrorBoundary";
