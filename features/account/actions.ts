import { operation } from "@/lib/operations/operation";
import type * as server from "./actions.server";
export const revokeMySession = operation<
  Parameters<typeof server.revokeMySession>[0],
  NonNullable<Awaited<ReturnType<typeof server.revokeMySession>>["data"]>
>("account-revokeMySession");
export const revokeMyOtherSessions = operation<
  Parameters<typeof server.revokeMyOtherSessions>[0],
  NonNullable<Awaited<ReturnType<typeof server.revokeMyOtherSessions>>["data"]>
>("account-revokeMyOtherSessions");
export const deleteMyAccount = operation<
  Parameters<typeof server.deleteMyAccount>[0],
  NonNullable<Awaited<ReturnType<typeof server.deleteMyAccount>>["data"]>
>("account-deleteMyAccount");
