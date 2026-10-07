import { operation } from "@/lib/operations/operation";
import type * as server from "./actions.server";
export const saveMascotSettings = operation<
  Parameters<typeof server.saveMascotSettings>[0],
  NonNullable<Awaited<ReturnType<typeof server.saveMascotSettings>>["data"]>
>("admin-settings-saveMascotSettings");
