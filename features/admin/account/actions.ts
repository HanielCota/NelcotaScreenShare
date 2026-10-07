import { operation } from "@/lib/operation";
import type * as server from "./actions.server";
export const revokeOwnSession = operation<
  Parameters<typeof server.revokeOwnSession>[0],
  NonNullable<Awaited<ReturnType<typeof server.revokeOwnSession>>["data"]>
>("admin-account-revokeOwnSession");
export const revokeOtherOwnSessions = operation<
  Parameters<typeof server.revokeOtherOwnSessions>[0],
  NonNullable<Awaited<ReturnType<typeof server.revokeOtherOwnSessions>>["data"]>
>("admin-account-revokeOtherOwnSessions");
