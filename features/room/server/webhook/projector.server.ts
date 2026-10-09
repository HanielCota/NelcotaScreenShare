import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "@/server/db/index.server";
import { livekitEvents } from "@/server/db/schema";
import { projectEvent, type ProjectionResult } from "./handlers.server";
import { occurredAt, webhookPayloadSchema } from "./payload";
import { logger } from "@/server/logger.server";

/**
 * LiveKit webhook → business tables (docs/archive/admin-plan.md §4.4).
 *
 * Each event is stored raw in `livekit_events` (the LiveKit id ensures that
 * redeliveries do not duplicate) and projected right after. The projection does not depend
 * on arrival order: participations are found by their natural key (room,
 * identity, the participant's own joined_at), shares by the track
 * sid, and times only move forward (greatest/least). An event that failed keeps
 * `error` set and `processed_at` null, to be reprocessed.
 */

export type IngestResult = "duplicate" | ProjectionResult | "failed";

/** Projects an already stored event; the error is recorded on the event itself. */
async function processStoredEvent(
  db: Database,
  id: string,
  payload: unknown,
): Promise<IngestResult> {
  try {
    const parsed = webhookPayloadSchema.parse(payload);
    return await db.transaction(async (tx) => {
      const projected = await projectEvent(tx, parsed);
      await tx
        .update(livekitEvents)
        .set({ processedAt: sql`now()`, error: null })
        .where(eq(livekitEvents.id, id));
      return projected;
    });
  } catch (error) {
    logger.error({ err: error, eventId: id }, "LiveKit event projection failed");
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(livekitEvents)
      .set({ error: message.slice(0, 1000) })
      .where(eq(livekitEvents.id, id));
    return "failed";
  }
}

/** Stores the raw event (a redelivery of the same id is ignored) and projects it. */
export async function ingestEvent(
  db: Database,
  id: string,
  payload: Record<string, unknown>,
): Promise<IngestResult> {
  const parsed = webhookPayloadSchema.safeParse(payload);
  const [stored] = await db
    .insert(livekitEvents)
    .values({
      id,
      event: parsed.success
        ? parsed.data.event
        : typeof payload.event === "string"
          ? payload.event
          : "desconhecido",
      roomName: parsed.success ? (parsed.data.room?.name ?? null) : null,
      payload,
      occurredAt: parsed.success ? occurredAt(parsed.data) : new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: livekitEvents.id });
  if (!stored) return "duplicate";
  return processStoredEvent(db, id, payload);
}

/**
 * Reprocesses pending events (failures), from oldest to newest.
 * `receivedBefore` leaves out those that just arrived and are still
 * being projected by the webhook itself.
 */
export async function reprocessPendingEvents(
  db: Database,
  { limit = 500, receivedBefore }: { limit?: number; receivedBefore?: Date } = {},
) {
  const pending = await db
    .select({ id: livekitEvents.id, payload: livekitEvents.payload })
    .from(livekitEvents)
    .where(
      and(
        isNull(livekitEvents.processedAt),
        receivedBefore ? lte(livekitEvents.receivedAt, receivedBefore) : undefined,
      ),
    )
    .orderBy(asc(livekitEvents.occurredAt))
    .limit(limit);
  const results: Record<IngestResult, number> = {
    duplicate: 0,
    projected: 0,
    ignored: 0,
    failed: 0,
  };
  for (const event of pending) {
    results[await processStoredEvent(db, event.id, event.payload)]++;
  }
  return results;
}
