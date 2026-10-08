import { eq } from "drizzle-orm";
import { z } from "zod";
import { BULK_FILTER_LIMIT } from "@/lib/table-params";
import { defineAdminOperation } from "@/features/auth/server/operation-policies.server";
import { ActionError } from "@/server/operations/action-error";
import { getUserAuth } from "@/features/auth/server/participant-auth.server";
import { getDb } from "@/server/db/index.server";
import { users } from "@/server/db/schema";
import {
  anonymizeParticipant,
  blockParticipants,
  restoreParticipants,
  revokeParticipantSessions,
  softDeleteParticipants,
  unblockParticipants,
} from "@/features/account/server/participant-accounts.server";
import {
  bulkChange,
  bulkSelectionSchema,
  resolveSelection,
  type BulkSelectionInput,
} from "@/server/table/selection.server";
import { participantIdsForFilter } from "./server/queries.server";

const reasonSchema = z
  .string()
  .trim()
  .min(3, "Escreva o motivo do bloqueio.")
  .max(300, "O motivo pode ter até 300 caracteres.");

function participantIds(selection: BulkSelectionInput) {
  const db = getDb();
  return resolveSelection(selection, (search, limit) => participantIdsForFilter(db, search, limit));
}

/** Block: sessions ended; sign-in and joining rooms refused. */
export const blockParticipantsAction = defineAdminOperation(
  {
    name: "participant.block",
    permission: { participant: ["update"] },
    audit: "required",
  },
  z.object({ selection: bulkSelectionSchema, reason: reasonSchema }),
  async ({ parsedInput, ctx }) => {
    const ids = await participantIds(parsedInput.selection);
    const changed = await bulkChange(
      ctx.audit,
      (tx) => blockParticipants(tx, ids, parsedInput.reason),
      {
        empty: "Nenhuma conta para bloquear na seleção.",
        entry: (id) => ({
          action: "user.block",
          resourceType: "user",
          resourceId: id,
          metadata: { motivo: parsedInput.reason },
        }),
      },
    );
    return { count: changed.length };
  },
);

export const unblockParticipantsAction = defineAdminOperation(
  {
    name: "participant.unblock",
    permission: { participant: ["update"] },
    audit: "required",
  },
  z.object({ selection: bulkSelectionSchema }),
  async ({ parsedInput, ctx }) => {
    const ids = await participantIds(parsedInput.selection);
    const changed = await bulkChange(ctx.audit, (tx) => unblockParticipants(tx, ids), {
      empty: "Nenhuma conta bloqueada na seleção.",
      entry: (id) => ({ action: "user.unblock", resourceType: "user", resourceId: id }),
    });
    return { count: changed.length };
  },
);

/** Reversible deletion: returns the IDs for "Desfazer" (undo). */
export const deleteParticipantsAction = defineAdminOperation(
  {
    name: "participant.delete",
    permission: { participant: ["delete"] },
    audit: "required",
  },
  z.object({ selection: bulkSelectionSchema }),
  async ({ parsedInput, ctx }) => {
    const ids = await participantIds(parsedInput.selection);
    const changed = await bulkChange(ctx.audit, (tx) => softDeleteParticipants(tx, ids), {
      empty: "Nenhuma conta para excluir na seleção.",
      entry: (id) => ({ action: "user.delete", resourceType: "user", resourceId: id }),
    });
    return { ids: changed };
  },
);

export const restoreParticipantsAction = defineAdminOperation(
  {
    name: "participant.restore",
    permission: { participant: ["delete"] },
    audit: "required",
  },
  z.object({ ids: z.array(z.uuid()).min(1).max(BULK_FILTER_LIMIT) }),
  async ({ parsedInput, ctx }) => {
    const changed = await bulkChange(ctx.audit, (tx) => restoreParticipants(tx, parsedInput.ids), {
      empty: "Nada para restaurar.",
      entry: (id) => ({ action: "user.restore", resourceType: "user", resourceId: id }),
    });
    return { count: changed.length };
  },
);

const idInput = z.object({ id: z.uuid() });

export const revokeParticipantSessionsAction = defineAdminOperation(
  {
    name: "participant.revokeSessions",
    permission: { participant: ["update"] },
    audit: "required",
  },
  idInput,
  async ({ parsedInput, ctx }) => {
    const db = getDb();
    const count = await db.transaction(async (tx) => {
      const removed = await revokeParticipantSessions(tx, [parsedInput.id]);
      if (removed === 0) throw new ActionError("Essa conta não tem sessões ativas.");
      await ctx.audit.record(tx, {
        action: "user.sessions_revoke",
        resourceType: "user",
        resourceId: parsedInput.id,
        metadata: { sessoes: removed },
      });
      return removed;
    });
    return { count };
  },
);

/** Resends the confirmation link (Better Auth rate-limits and generates the link). */
export const resendVerificationAction = defineAdminOperation(
  {
    name: "participant.resendVerification",
    permission: { participant: ["update"] },
    audit: "required",
  },
  idInput,
  async ({ parsedInput, ctx }) => {
    const db = getDb();
    const [user] = await db
      .select({ email: users.email, verified: users.emailVerified, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, parsedInput.id));
    if (!user || user.deletedAt) throw new ActionError("Conta não encontrada.");
    if (user.verified) throw new ActionError("Esse e-mail já está confirmado.");
    await getUserAuth().api.sendVerificationEmail({
      body: { email: user.email, callbackURL: "/" },
    });
    await ctx.audit.record(db, {
      action: "user.verification_resend",
      resourceType: "user",
      resourceId: parsedInput.id,
    });
    return { sent: true };
  },
);

/** LGPD, irreversible: owner only, with a recent session and typing ANONIMIZAR. */
export const anonymizeParticipantAction = defineAdminOperation(
  {
    name: "participant.anonymize",
    permission: { participant: ["anonymize"] },
    fresh: true,
    audit: "required",
  },
  z.object({
    id: z.uuid(),
    confirmation: z.literal("ANONIMIZAR", { error: "Digite ANONIMIZAR para confirmar." }),
  }),
  async ({ parsedInput, ctx }) => {
    const db = getDb();
    await db.transaction(async (tx) => {
      if (!(await anonymizeParticipant(tx, parsedInput.id))) {
        throw new ActionError("Essa conta já foi anonimizada.");
      }
      await ctx.audit.record(tx, {
        action: "user.anonymize",
        resourceType: "user",
        resourceId: parsedInput.id,
      });
    });
    return { anonymized: true };
  },
);
