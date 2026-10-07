import { z } from "zod";
import { roomCodeSchema } from "./room-code";

/**
 * HTTP contract of POST /api/token, the same in the browser and on the server.
 */
/** The name and identity come from the signed-in account (server), never from the browser. */
export const tokenRequestSchema = z.object({
  room: roomCodeSchema,
  password: z.string().max(128).optional(),
  /** Dashboard invite token (?convite= in the room link). */
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
