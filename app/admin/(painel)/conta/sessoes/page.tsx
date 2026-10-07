import type { Metadata } from "next";
import { SessionList } from "@/components/auth/SessionList";
import { requireAdmin } from "@/server/auth/admin-session";
import { listActiveSessions } from "@/server/auth/sessions";
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
        scope="admin"
        currentId={admin.session.id}
        sessions={rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
