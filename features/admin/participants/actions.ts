"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BULK_FILTER_LIMIT } from "@/lib/table-params";
import { adminAction } from "@/features/auth/server/action-clients";
import { ActionError } from "@/server/actions/errors";
import { getUserAuth } from "@/features/auth/server/participant-auth";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import {
  anonymizeParticipant,
  blockParticipants,
  restoreParticipants,
  revokeParticipantSessions,
  softDeleteParticipants,
  unblockParticipants,
} from "@/features/participants/server/operations";
import { bulkSelectionSchema, resolveSelection } from "@/server/table/selection";
import { participantIdsForFilter } from "./queries";

function refresh(id?: string) {
  revalidatePath("/admin/usuarios");
  if (id) revalidatePath(`/admin/usuarios/${id}`);
}

const reasonSchema = z
  .string()
  .trim()
  .min(3, "Escreva o motivo do bloqueio.")
  .max(300, "O motivo pode ter até 300 caracteres.");

/** Bloquear: sessões encerradas; login e entrada em salas recusados. */
export const blockParticipantsAction = adminAction
  .metadata({
    name: "participant.block",
    permission: { participant: ["update"] },
    audit: "required",
  })
  .inputSchema(z.object({ selection: bulkSelectionSchema, reason: reasonSchema }))
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const ids = await resolveSelection(parsedInput.selection, (search, limit) =>
      participantIdsForFilter(db, search, limit),
    );
    const changed = await db.transaction(async (tx) => {
      const done = await blockParticipants(tx, ids, parsedInput.reason);
      if (done.length === 0) throw new ActionError("Nenhuma conta para bloquear na seleção.");
      await ctx.audit.recordMany(
        tx,
        done.map((id) => ({
          action: "user.block",
          resourceType: "user",
          resourceId: id,
          metadata: { motivo: parsedInput.reason },
        })),
      );
      return done;
    });
    refresh(ids.length === 1 ? ids[0] : undefined);
    return { count: changed.length };
  });

export const unblockParticipantsAction = adminAction
  .metadata({
    name: "participant.unblock",
    permission: { participant: ["update"] },
    audit: "required",
  })
  .inputSchema(z.object({ selection: bulkSelectionSchema }))
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const ids = await resolveSelection(parsedInput.selection, (search, limit) =>
      participantIdsForFilter(db, search, limit),
    );
    const changed = await db.transaction(async (tx) => {
      const done = await unblockParticipants(tx, ids);
      if (done.length === 0) throw new ActionError("Nenhuma conta bloqueada na seleção.");
      await ctx.audit.recordMany(
        tx,
        done.map((id) => ({ action: "user.unblock", resourceType: "user", resourceId: id })),
      );
      return done;
    });
    refresh(ids.length === 1 ? ids[0] : undefined);
    return { count: changed.length };
  });

/** Exclusão reversível: devolve os IDs para o "Desfazer". */
export const deleteParticipantsAction = adminAction
  .metadata({
    name: "participant.delete",
    permission: { participant: ["delete"] },
    audit: "required",
  })
  .inputSchema(z.object({ selection: bulkSelectionSchema }))
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const ids = await resolveSelection(parsedInput.selection, (search, limit) =>
      participantIdsForFilter(db, search, limit),
    );
    const changed = await db.transaction(async (tx) => {
      const done = await softDeleteParticipants(tx, ids);
      if (done.length === 0) throw new ActionError("Nenhuma conta para excluir na seleção.");
      await ctx.audit.recordMany(
        tx,
        done.map((id) => ({ action: "user.delete", resourceType: "user", resourceId: id })),
      );
      return done;
    });
    refresh(ids.length === 1 ? ids[0] : undefined);
    return { ids: changed };
  });

export const restoreParticipantsAction = adminAction
  .metadata({
    name: "participant.restore",
    permission: { participant: ["delete"] },
    audit: "required",
  })
  .inputSchema(z.object({ ids: z.array(z.uuid()).min(1).max(BULK_FILTER_LIMIT) }))
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const changed = await db.transaction(async (tx) => {
      const done = await restoreParticipants(tx, parsedInput.ids);
      if (done.length === 0) throw new ActionError("Nada para restaurar.");
      await ctx.audit.recordMany(
        tx,
        done.map((id) => ({ action: "user.restore", resourceType: "user", resourceId: id })),
      );
      return done;
    });
    refresh(parsedInput.ids.length === 1 ? parsedInput.ids[0] : undefined);
    return { count: changed.length };
  });

const idInput = z.object({ id: z.uuid() });

export const revokeParticipantSessionsAction = adminAction
  .metadata({
    name: "participant.revokeSessions",
    permission: { participant: ["update"] },
    audit: "required",
  })
  .inputSchema(idInput)
  .action(async ({ parsedInput, ctx }) => {
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
    refresh(parsedInput.id);
    return { count };
  });

/** Reenvia o link de confirmação (o Better Auth limita e gera o link). */
export const resendVerificationAction = adminAction
  .metadata({
    name: "participant.resendVerification",
    permission: { participant: ["update"] },
    audit: "required",
  })
  .inputSchema(idInput)
  .action(async ({ parsedInput, ctx }) => {
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
  });

/** LGPD, irreversível: só o owner, com sessão recente e digitando ANONIMIZAR. */
export const anonymizeParticipantAction = adminAction
  .metadata({
    name: "participant.anonymize",
    permission: { participant: ["anonymize"] },
    fresh: true,
    audit: "required",
  })
  .inputSchema(
    z.object({
      id: z.uuid(),
      confirmation: z.literal("ANONIMIZAR", { error: "Digite ANONIMIZAR para confirmar." }),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
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
    refresh(parsedInput.id);
    return { anonymized: true };
  });
