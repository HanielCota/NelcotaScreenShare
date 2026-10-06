import { KeyRound, MonitorSmartphone, Settings2 } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin-session";
import { can } from "@/server/auth/permissions";

export default async function AdminHomePage() {
  const admin = await requireAdmin({ dashboard: ["read"] });
  const firstName = admin.user.name.split(" ")[0];
  const links = [
    can(admin.user.role, { settings: ["read"] })
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
        <h1 className="text-2xl font-bold tracking-tight">Olá, {firstName}</h1>
        <p className="mt-1 text-ink-muted">
          Métricas, salas e usuários chegam nas próximas fases do painel.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="glass flex h-full flex-col gap-3 rounded-2xl p-5 transition-colors hover:bg-surface-2/80"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-surface-2">
                <Icon className="size-5 text-brand-soft" aria-hidden="true" />
              </span>
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-ink-muted">{text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
