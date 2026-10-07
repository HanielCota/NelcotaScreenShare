import { operation } from "@/lib/operation";
import type * as server from "./actions.server";
export const blockParticipantsAction = operation<
  Parameters<typeof server.blockParticipantsAction>[0],
  NonNullable<Awaited<ReturnType<typeof server.blockParticipantsAction>>["data"]>
>("admin-participants-blockParticipantsAction");
export const unblockParticipantsAction = operation<
  Parameters<typeof server.unblockParticipantsAction>[0],
  NonNullable<Awaited<ReturnType<typeof server.unblockParticipantsAction>>["data"]>
>("admin-participants-unblockParticipantsAction");
export const deleteParticipantsAction = operation<
  Parameters<typeof server.deleteParticipantsAction>[0],
  NonNullable<Awaited<ReturnType<typeof server.deleteParticipantsAction>>["data"]>
>("admin-participants-deleteParticipantsAction");
export const restoreParticipantsAction = operation<
  Parameters<typeof server.restoreParticipantsAction>[0],
  NonNullable<Awaited<ReturnType<typeof server.restoreParticipantsAction>>["data"]>
>("admin-participants-restoreParticipantsAction");
export const revokeParticipantSessionsAction = operation<
  Parameters<typeof server.revokeParticipantSessionsAction>[0],
  NonNullable<Awaited<ReturnType<typeof server.revokeParticipantSessionsAction>>["data"]>
>("admin-participants-revokeParticipantSessionsAction");
export const resendVerificationAction = operation<
  Parameters<typeof server.resendVerificationAction>[0],
  NonNullable<Awaited<ReturnType<typeof server.resendVerificationAction>>["data"]>
>("admin-participants-resendVerificationAction");
export const anonymizeParticipantAction = operation<
  Parameters<typeof server.anonymizeParticipantAction>[0],
  NonNullable<Awaited<ReturnType<typeof server.anonymizeParticipantAction>>["data"]>
>("admin-participants-anonymizeParticipantAction");
