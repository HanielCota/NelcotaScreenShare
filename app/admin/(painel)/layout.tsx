import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavBar, NavBrand, NavDivider, navItemClass } from "@/components/NavBar";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireAdmin } from "@/server/auth/admin-session";
import { can } from "@/server/auth/permissions";
import { ADMIN_ROLE_LABELS } from "@/server/auth/roles";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin Nelcota" } };

/**
 * Shell do painel. Toda página aqui exige sessão de admin e, para quem altera
 * dados, 2FA ativo; a única exceção é a tela que configura o 2FA.
 * (Shell completo com sidebar e command palette: Fase 2.)
 */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const admin = await requireAdmin(undefined, {
    allowWithoutTwoFactor: pathname.startsWith("/admin/conta/seguranca"),
  });
  const role = admin.user.role;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
        <NavBar aria-label="Painel admin" className="mx-auto max-w-6xl">
          <NavBrand href="/admin" />
          <NavDivider />
          <Link href="/admin" className={navItemClass}>
            Início
          </Link>
          {can(role, { settings: ["read"] }) ? (
            <Link href="/admin/configuracoes" className={navItemClass}>
              Configurações
            </Link>
          ) : null}
          <Link href="/admin/conta/seguranca" className={`${navItemClass} max-sm:hidden`}>
            Minha conta
          </Link>
          <span className="ml-auto flex items-center gap-1">
            <span className="hidden flex-col items-end px-2 leading-tight md:flex">
              <span className="text-sm font-semibold">{admin.user.name}</span>
              <span className="text-xs text-ink-subtle">{ADMIN_ROLE_LABELS[role]}</span>
            </span>
            <ThemeToggle />
            <NavDivider />
            <SignOutButton />
          </span>
        </NavBar>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
