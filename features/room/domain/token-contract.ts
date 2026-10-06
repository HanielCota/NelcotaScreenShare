import { z } from "zod";
import { roomCodeSchema } from "./room-code";

/**
 * Contrato HTTP do POST /api/token, o mesmo no navegador e no servidor.
 */
/** O nome e a identidade vêm da conta logada (servidor), nunca do navegador. */
export const tokenRequestSchema = z.object({
  room: roomCodeSchema,
  password: z.string().max(128).optional(),
  /** Token de convite do painel (?convite= no link da sala). */
  invite: z.string().max(64).optional(),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;

export const tokenResponseSchema = z.object({
  token: z.string(),
  serverUrl: z.string(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const tokenErrorSchema = z.object({
  error: z.enum([
    "invalid_request",
    "unauthenticated",
    "email_unverified",
    "blocked",
    "cross_site",
    "invalid_password",
    "invite_invalid",
    "room_full",
    "rate_limited",
    "server_error",
  ]),
  message: z.string(),
});

export type TokenErrorCode = z.infer<typeof tokenErrorSchema>["error"];
