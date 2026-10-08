import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData, Link } from "react-router";

import { ArrowUpRight, KeyRound, MonitorSmartphone, Settings2 } from "lucide-react";
import { Mascot } from "@/features/mascot/ui/Mascot";
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
      <section className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-line bg-surface px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-ink-subtle">Painel admin</p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Olá, {firstName}</h1>
          <p className="max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
            Escolha uma área do painel para começar.
          </p>
        </div>
        <Mascot
          facing="left"
          className="size-24 shrink-0 overflow-hidden sm:size-36"
          sizes="(min-width: 640px) 432px, 288px"
        />
      </section>
      <h2 className="text-lg font-medium tracking-tight">Acesso rápido</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              viewTransition
              to={href}
              className="group/shortcut flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-surface-2">
                  <Icon className="size-5 text-brand-soft" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="size-4 text-ink-subtle transition-transform group-hover/shortcut:translate-x-0.5 group-hover/shortcut:-translate-y-0.5 motion-reduce:transform-none"
                  aria-hidden="true"
                />
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
