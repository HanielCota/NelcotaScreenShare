import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { revokeMyOtherSessions, revokeMySession } from "@/features/account/actions";
import Link from "next/link";
import { Section } from "@/features/account/ui/AccountSection";
import { ChangeEmailForm } from "@/features/account/ui/ChangeEmailForm";
import { ChangePasswordForm } from "@/features/account/ui/ChangePasswordForm";
import { DataAndDeletion } from "@/features/account/ui/DataAndDeletion";
import { ProfileForm } from "@/features/account/ui/ProfileForm";
import { UserSignOutButton } from "@/features/account/ui/UserSignOutButton";
import { NavBar, NavBrand, NavDivider } from "@/components/NavBar";
import { SessionList } from "@/features/auth/ui/SessionList";
import { TwoFactorSettings } from "@/features/auth/ui/TwoFactorSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { safeReturnPath } from "@/features/auth/domain/return-path";
import { listActiveSessions } from "@/features/auth/server/sessions";
import { requireUser } from "@/features/auth/server/participant-session";
import { getDb } from "@/server/db";
import { userSessions } from "@/server/db/schema";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Minha conta" };

const NOTICES: Record<string, string> = {
  email: "E-mail confirmado e atualizado.",
};

export default async function AccountPage({ searchParams }: PageProps<"/conta">) {
  const current = await requireUser("/conta", { requireVerified: false });
  const { voltar, aviso } = await searchParams;
  const back = typeof voltar === "string" ? safeReturnPath(voltar, "") : "";
  const sessions = await listActiveSessions(getDb(), userSessions, current.user.id);
  const notice = typeof aviso === "string" ? NOTICES[aviso] : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-4 pt-4 sm:px-6">
        <NavBar aria-label="Conta" className="mx-auto max-w-3xl">
          <NavBrand href="/" />
          <NavDivider />
          <span className="px-2 text-sm font-semibold">Minha conta</span>
          <span className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NavDivider />
            <UserSignOutButton />
          </span>
        </NavBar>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {back ? (
          <Link
            href={back}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-soft hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a sala
          </Link>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
          <p className="mt-1 text-ink-muted">{current.user.email}</p>
        </div>
        {notice ? (
          <output className="block rounded-xl bg-surface-2 px-4 py-3 text-sm">{notice}</output>
        ) : null}
        {current.user.emailVerified || !getEnv().REQUIRE_EMAIL_VERIFICATION ? null : (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            Seu e-mail ainda não foi confirmado: confirme para entrar em salas.{" "}
            <Link href="/verificar-email" className="font-semibold underline">
              Reenviar link
            </Link>
          </p>
        )}

        <Section title="Perfil" description="É como as outras pessoas veem você nas salas.">
          <ProfileForm name={current.user.name} />
        </Section>
        <Section title="E-mail" description={`Atual: ${current.user.email}`}>
          <ChangeEmailForm email={current.user.email} />
        </Section>
        <Section title="Senha">
          <ChangePasswordForm />
        </Section>
        <TwoFactorSettings
          scope="user"
          enabled={current.user.twoFactorEnabled}
          required={false}
          doneHref="/conta"
        />
        <Section title="Sessões ativas" description="Onde sua conta está conectada agora.">
          <SessionList
            currentId={current.session.id}
            revokeSession={revokeMySession}
            revokeOtherSessions={revokeMyOtherSessions}
            sessions={sessions.map((row) => ({
              ...row,
              createdAt: row.createdAt.toISOString(),
              updatedAt: row.updatedAt.toISOString(),
            }))}
          />
        </Section>
        <Section title="Seus dados" tone="danger">
          <DataAndDeletion />
        </Section>
      </main>
    </div>
  );
}
