import { z } from "zod";

/** Validity choices of a room invite (no choice = it never expires). */
export const INVITE_VALIDITY = [
  { hours: 1, label: "1 hora" },
  { hours: 24, label: "1 dia" },
  { hours: 24 * 7, label: "7 dias" },
  { hours: 24 * 30, label: "30 dias" },
] as const;

export const INVITE_MAX_USES = 1000;

/** People limit of an invite (`null` = unlimited). */
export const inviteMaxUsesSchema = z.number().int().min(1).max(INVITE_MAX_USES).nullable();
