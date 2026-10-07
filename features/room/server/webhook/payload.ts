import { z } from "zod";
import type { leaveReason } from "@/server/db/schema";

/** Formato JSON do protobuf (`WebhookEvent.toJson()`): bigint vira string, enum vira nome. */
const timestampSchema = z.coerce.number().nonnegative().optional();
export const webhookPayloadSchema = z.object({
  id: z.string().optional(),
  event: z.string(),
  createdAt: timestampSchema,
  room: z
    .object({
      sid: z.string().optional(),
      name: z.string().optional(),
      creationTime: timestampSchema,
    })
    .optional(),
  participant: z
    .object({
      sid: z.string().min(1),
      identity: z.string(),
      name: z.string().optional(),
      joinedAt: timestampSchema,
      joinedAtMs: timestampSchema,
      disconnectReason: z.string().optional(),
    })
    .optional(),
  track: z.object({ sid: z.string(), source: z.string().optional() }).optional(),
});
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type WebhookParticipant = NonNullable<WebhookPayload["participant"]>;

/** Motivo de saída gravado (o enum do banco). */
export type LeaveReason = (typeof leaveReason.enumValues)[number];

/** Motivo do LiveKit (DisconnectReason) para o motivo gravado. */
export function leaveReasonFrom(reason: string | undefined): LeaveReason {
  switch (reason) {
    case "CLIENT_INITIATED":
      return "left";
    case "PARTICIPANT_REMOVED":
      return "removed_by_admin";
    case "ROOM_DELETED":
    case "ROOM_CLOSED":
      return "room_closed";
    case undefined:
    case "UNKNOWN_REASON":
      return "unknown";
    default:
      return "disconnected";
  }
}

/** Horário do evento (o LiveKit manda em segundos). */
export function occurredAt(payload: WebhookPayload): Date {
  return payload.createdAt ? new Date(payload.createdAt * 1000) : new Date();
}
