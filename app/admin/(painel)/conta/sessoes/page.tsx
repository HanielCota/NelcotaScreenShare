import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { SessionList } from "@/components/admin/account/SessionList";
import { requireAdmin } from "@/server/auth/admin-session";
import { getDb } from "@/server/db";
import { adminSessions } from "@/server/db/schema";

export const metadata: Metadata = { title: "Sessões ativas" };

export default async function AccountSessionsPage() {
  const admin = await requireAdmin(undefined, { allowWithoutTwoFactor: true });
  const db = getDb();
  const rows = db
    ? await db
        .select({
          id: adminSessions.id,
          ipAddress: adminSessions.ipAddress,
          userAgent: adminSessions.userAgent,
          createdAt: adminSessions.createdAt,
          updatedAt: adminSessions.updatedAt,
        })
        .from(adminSessions)
        .where(
          and(eq(adminSessions.userId, admin.user.id), gt(adminSessions.expiresAt, sql`now()`)),
        )
        .orderBy(desc(adminSessions.updatedAt))
    : [];

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
        sessions={rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }))}
      />
    </>
  );
}
