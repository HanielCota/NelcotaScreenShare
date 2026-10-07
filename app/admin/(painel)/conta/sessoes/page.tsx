import type { Metadata } from "next";
import { revokeOtherOwnSessions, revokeOwnSession } from "@/features/admin/account/actions";
import { SessionList } from "@/features/auth/ui/SessionList";
import { requireAdmin } from "@/features/auth/server/admin-session";
import { listActiveSessions } from "@/features/auth/server/sessions";
import { getDb } from "@/server/db";
import { adminSessions } from "@/server/db/schema";

export const metadata: Metadata = { title: "Sessões ativas" };

export default async function AccountSessionsPage() {
  const admin = await requireAdmin(undefined, { allowWithoutTwoFactor: true });
  const rows = await listActiveSessions(getDb(), adminSessions, admin.user.id);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sessões ativas</h1>
        <p className="mt-1 text-ink-muted">
          Onde sua conta está conectada. Encerre o que você não reconhecer e troque a senha.
        </p>
      </div>
      <SessionList
        currentId={admin.session.id}
        revokeSession={revokeOwnSession}
        revokeOtherSessions={revokeOtherOwnSessions}
        sessions={rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
