import "server-only";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import {
  roomParticipations,
  userAccounts,
  users,
  userSessions,
  userTwoFactors,
  userVerifications,
} from "@/server/db/schema";

/**
 * Operações sobre contas de participantes, usadas pelo painel (em massa) e
 * pelo próprio titular. Cada uma devolve só as linhas que realmente mudaram,
 * para a auditoria registrar exatamente o que aconteceu.
 */

/** Bloqueia e derruba as sessões: login e /api/token passam a recusar. */
export async function blockParticipants(tx: DbExecutor, ids: string[], reason: string) {
  const changed = await tx
    .update(users)
    .set({ blockedAt: sql`now()`, blockReason: reason })
    .where(and(inArray(users.id, ids), isNull(users.blockedAt), isNull(users.deletedAt)))
    .returning({ id: users.id });
  await revokeParticipantSessions(
    tx,
    changed.map((row) => row.id),
  );
  return changed.map((row) => row.id);
}

export async function unblockParticipants(tx: DbExecutor, ids: string[]) {
  const changed = await tx
    .update(users)
    .set({ blockedAt: null, blockReason: null })
    .where(and(inArray(users.id, ids), isNotNull(users.blockedAt), isNull(users.deletedAt)))
    .returning({ id: users.id });
  return changed.map((row) => row.id);
}

/** Exclusão reversível (some das listas e não entra mais); anonimizar é outra coisa. */
export async function softDeleteParticipants(tx: DbExecutor, ids: string[]) {
  const changed = await tx
    .update(users)
    .set({ deletedAt: sql`now()` })
    .where(and(inArray(users.id, ids), isNull(users.deletedAt)))
    .returning({ id: users.id });
  await revokeParticipantSessions(
    tx,
    changed.map((row) => row.id),
  );
  return changed.map((row) => row.id);
}

/** Desfaz a exclusão (conta anonimizada não volta). */
export async function restoreParticipants(tx: DbExecutor, ids: string[]) {
  const changed = await tx
    .update(users)
    .set({ deletedAt: null })
    .where(and(inArray(users.id, ids), isNotNull(users.deletedAt), isNull(users.anonymizedAt)))
    .returning({ id: users.id });
  return changed.map((row) => row.id);
}

export async function revokeParticipantSessions(tx: DbExecutor, ids: string[]) {
  if (ids.length === 0) return 0;
  const removed = await tx
    .delete(userSessions)
    .where(inArray(userSessions.userId, ids))
    .returning({ id: userSessions.id });
  return removed.length;
}

/**
 * Anonimização definitiva (LGPD): e-mail e nome viram valores sem dados
 * pessoais, credenciais e sessões somem e o nome sai do histórico de salas.
 * O IP das participações fica até a retenção de 6 meses (registro de acesso
 * exigido pelo Marco Civil, art. 15).
 */
export async function anonymizeParticipant(tx: DbExecutor, id: string) {
  const [current] = await tx
    .select({ email: users.email, anonymizedAt: users.anonymizedAt })
    .from(users)
    .where(eq(users.id, id));
  if (!current || current.anonymizedAt) return false;
  await tx
    .update(users)
    .set({
      name: "Pessoa removida",
      email: `removido+${id}@invalid.nelcota`,
      emailVerified: false,
      image: null,
      twoFactorEnabled: false,
      blockReason: null,
      anonymizedAt: sql`now()`,
      deletedAt: sql`coalesce(${users.deletedAt}, now())`,
    })
    .where(eq(users.id, id));
  await tx
    .update(roomParticipations)
    .set({ displayName: null })
    .where(eq(roomParticipations.userId, id));
  await tx.delete(userAccounts).where(eq(userAccounts.userId, id));
  await tx.delete(userTwoFactors).where(eq(userTwoFactors.userId, id));
  await tx.delete(userSessions).where(eq(userSessions.userId, id));
  await tx.delete(userVerifications).where(eq(userVerifications.identifier, current.email));
  return true;
}
