import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { MascotSettingsForm } from "@/components/admin/MascotSettingsForm";
import { NavBar, NavBrand, NavDivider } from "@/components/NavBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getEnv } from "@/server/env";
import { getSetting, MASCOT_SATURATION, mascotSettings } from "@/server/settings";
import { login, logout, saveMascot } from "./actions";
import { adminCredentials, hasAdminSession } from "./session";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  if (!adminCredentials()) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-2xl p-8">
          <h1 className="text-2xl font-bold tracking-tight">Painel admin desligado</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Defina <code>ADMIN_PASSWORD</code> e <code>ADMIN_SESSION_SECRET</code> nas variáveis de
            ambiente do servidor para ligar o painel.
          </p>
        </div>
      </main>
    );
  }

  if (!(await hasAdminSession())) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <AdminLogin action={login} />
      </main>
    );
  }

  const mascot = await getSetting(mascotSettings);
  const hasDatabase = Boolean(getEnv().DATABASE_URL);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 px-4 pt-4 pb-16 sm:px-6">
      <h1 className="sr-only">Painel admin</h1>
      <header className="w-full">
        <NavBar aria-label="Admin" className="mx-auto max-w-5xl">
          <NavBrand href="/" />
          <NavDivider />
          <span className="px-2 text-sm font-semibold">Admin</span>
          <ThemeToggle className="ml-auto" />
          <NavDivider />
          <form action={logout}>
            <Button type="submit" variant="ghost" className="h-9 rounded-xl px-3">
              <LogOut aria-hidden="true" />
              Sair
            </Button>
          </form>
        </NavBar>
      </header>

      {hasDatabase ? null : (
        <p
          role="alert"
          className="w-full max-w-3xl rounded-xl bg-danger/15 px-4 py-3 text-sm text-danger"
        >
          DATABASE_URL não está definida: o painel mostra os valores padrão e não consegue salvar.
        </p>
      )}

      <MascotSettingsForm initial={mascot} limits={MASCOT_SATURATION} action={saveMascot} />
    </main>
  );
}
