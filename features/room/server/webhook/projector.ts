import "server-only";
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "@/server/db";
import { livekitEvents } from "@/server/db/schema";
import { projectEvent, type ProjectionResult } from "./handlers";
import { occurredAt, webhookPayloadSchema } from "./payload";

/**
 * Webhook do LiveKit → tabelas de negócio (docs/PLANO-ADMIN.md §4.4).
 *
 * Cada evento é gravado bruto em `livekit_events` (o id do LiveKit garante que
 * reenvios não dupliquem) e projetado em seguida. A projeção não depende da
 * ordem de chegada: participações são achadas pela chave natural (sala,
 * identidade, joined_at do próprio participante), compartilhamentos pelo sid
 * da faixa, e horários só avançam (greatest/least). Um evento que falhou fica
 * com `error` e `processed_at` nulo, para reprocessar.
 */

export type IngestResult = "duplicate" | ProjectionResult | "failed";

/** Projeta um evento já gravado; o erro fica registrado no próprio evento. */
async function processStoredEvent(
  db: Database,
  id: string,
  payload: unknown,
): Promise<IngestResult> {
  try {
    const parsed = webhookPayloadSchema.parse(payload);
    const result = await db.transaction(async (tx) => {
      const projected = await projectEvent(tx, parsed);
      await tx
        .update(livekitEvents)
        .set({ processedAt: sql`now()`, error: null })
        .where(eq(livekitEvents.id, id));
      return projected;
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(livekitEvents)
      .set({ error: message.slice(0, 1000) })
      .where(eq(livekitEvents.id, id));
    return "failed";
  }
}

/** Grava o evento bruto (reenvio do mesmo id é ignorado) e projeta. */
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
 * Reprocessa eventos pendentes (falhas), do mais antigo ao mais novo.
 * `receivedBefore` deixa de fora os que acabaram de chegar e ainda estão
 * sendo projetados pelo próprio webhook.
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
