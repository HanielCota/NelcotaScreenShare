import { and, desc, eq, gt, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChangeEmailForm,
  ChangePasswordForm,
  DataAndDeletion,
  ProfileForm,
  Section,
} from "@/components/account/AccountForms";
import { UserSignOutButton } from "@/components/account/UserSignOutButton";
import { NavBar, NavBrand, NavDivider } from "@/components/NavBar";
import { SessionList } from "@/components/auth/SessionList";
import { TwoFactorSettings } from "@/components/auth/TwoFactorSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { requireUser, safeReturnPath } from "@/server/auth/user-session";
import { getDb } from "@/server/db";
import { userSessions } from "@/server/db/schema";

export const metadata: Metadata = { title: "Minha conta" };

const NOTICES: Record<string, string> = {
  email: "E-mail confirmado e atualizado.",
};

export default async function AccountPage({ searchParams }: PageProps<"/conta">) {
  const current = await requireUser("/conta", { requireVerified: false });
  const { voltar, aviso } = await searchParams;
  const back = typeof voltar === "string" ? safeReturnPath(voltar, "") : "";
  const db = getDb();
  const sessions = db
    ? await db
        .select({
          id: userSessions.id,
          ipAddress: userSessions.ipAddress,
          userAgent: userSessions.userAgent,
          createdAt: userSessions.createdAt,
          updatedAt: userSessions.updatedAt,
        })
        .from(userSessions)
        .where(
          and(eq(userSessions.userId, current.user.id), gt(userSessions.expiresAt, sql`now()`)),
        )
        .orderBy(desc(userSessions.updatedAt))
    : [];
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
        {current.user.emailVerified ? null : (
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
            scope="user"
            currentId={current.session.id}
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
