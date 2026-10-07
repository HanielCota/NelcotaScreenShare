import { operation } from "@/lib/operations/operation";
import type * as server from "./actions.server";
export const acceptInvitation = operation<
  Parameters<typeof server.acceptInvitation>[0],
  NonNullable<Awaited<ReturnType<typeof server.acceptInvitation>>["data"]>
>("auth-acceptInvitation");
