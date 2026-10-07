import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Database } from "@/server/db/index.server";
import { adminInvitations, adminUsers } from "@/server/db/schema";
import { appUrl } from "@/server/env.server";
import type { AdminAuth } from "./admin-auth.server";
import { PASSWORD_LIMITS } from "./password.server";
import type { AdminRole } from "@/features/auth/domain/roles";

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
/** Convite do script de bootstrap do primeiro owner: curto de propósito. */
export const OWNER_BOOTSTRAP_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function invitationUrl(token: string): string {
  return `${appUrl()}/admin/convite/${token}`;
}

/**
 * Cria um convite (o token só existe no retorno; o banco guarda o SHA-256).
 * Um convite pendente anterior para o mesmo e-mail é revogado.
 */
export async function createAdminInvitation(
  db: Database,
  {
    email,
    role,
    invitedBy,
    ttlMs = INVITE_TTL_MS,
  }: { email: string; role: AdminRole; invitedBy: string | null; ttlMs?: number },
) {
  const token = randomBytes(32).toString("base64url");
  const normalized = email.trim().toLowerCase();
  const invitation = await db.transaction(async (tx) => {
    await tx
      .update(adminInvitations)
      .set({ status: "revoked" })
      .where(
        and(
          sql`lower(${adminInvitations.email}) = ${normalized}`,
          eq(adminInvitations.status, "pending"),
        ),
      );
    const [row] = await tx
      .insert(adminInvitations)
      .values({
        email: normalized,
        role,
        invitedBy,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      })
      .returning();
    return row;
  });
  if (!invitation) throw new Error("Convite não criado");
  return { token, url: invitationUrl(token), invitation };
}

/** Convite pendente e dentro da validade, ou `undefined`. */
export async function findPendingInvitation(db: Database, token: string) {
  const [row] = await db
    .select()
    .from(adminInvitations)
    .where(
      and(
        eq(adminInvitations.tokenHash, hashToken(token)),
        eq(adminInvitations.status, "pending"),
        gt(adminInvitations.expiresAt, sql`now()`),
      ),
    );
  return row;
}

export type AcceptResult =
  | { ok: true; userId: string; email: string; invitationId: string; role: string }
  | { ok: false; reason: "invalid" | "already_admin" | "weak_password" };

/**
 * Aceita o convite: cria a conta de admin com e-mail já verificado e a senha
 * escolhida. O convite é "reservado" com um UPDATE condicional antes de criar a
 * conta, então o mesmo link não cria duas contas mesmo com cliques simultâneos.
 */
export async function acceptAdminInvitation(
  db: Database,
  auth: AdminAuth,
  { token, name, password }: { token: string; name: string; password: string },
): Promise<AcceptResult> {
  if (password.length < PASSWORD_LIMITS.admin.min || password.length > PASSWORD_LIMITS.admin.max) {
    return { ok: false, reason: "weak_password" };
  }

  const [claimed] = await db
    .update(adminInvitations)
    .set({ status: "accepted", acceptedAt: sql`now()` })
    .where(
      and(
        eq(adminInvitations.tokenHash, hashToken(token)),
        eq(adminInvitations.status, "pending"),
        gt(adminInvitations.expiresAt, sql`now()`),
      ),
    )
    .returning();
  if (!claimed) return { ok: false, reason: "invalid" };

  const release = () =>
    db
      .update(adminInvitations)
      .set({ status: "pending", acceptedAt: null })
      .where(eq(adminInvitations.id, claimed.id));

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${claimed.email.toLowerCase()}`);
  if (existing) {
    await db
      .update(adminInvitations)
      .set({ status: "revoked" })
      .where(eq(adminInvitations.id, claimed.id));
    return { ok: false, reason: "already_admin" };
  }

  // O Better Auth cria a conta pela própria conexão (fora de uma transação
  // nossa): se algo falhar depois, a conta criada é desfeita antes de liberar o
  // convite, senão sobraria um admin sem senha e o convite seria revogado.
  let createdUserId: string | undefined;
  try {
    const ctx = await auth.$context;
    const user = await ctx.internalAdapter.createUser(
      {
        email: claimed.email,
        name: name.trim(),
        emailVerified: true,
        role: claimed.role,
      },
      { method: "admin" },
    );
    createdUserId = user.id;
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await ctx.password.hash(password),
    });
    await db
      .update(adminInvitations)
      .set({ acceptedUserId: user.id })
      .where(eq(adminInvitations.id, claimed.id));
    return {
      ok: true,
      userId: user.id,
      email: claimed.email,
      invitationId: claimed.id,
      role: claimed.role,
    };
  } catch (error) {
    if (createdUserId) await db.delete(adminUsers).where(eq(adminUsers.id, createdUserId));
    await release();
    throw error;
  }
}
