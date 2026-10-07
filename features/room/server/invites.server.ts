import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { INVITE_TOKEN_PATTERN } from "@/features/room/domain/invite-token";
import type { Database, DbExecutor } from "@/server/db/index.server";
import { roomInvites, roomInviteUses, rooms } from "@/server/db/schema";

/**
 * Room invites: a link with an expiry and/or a people limit, created in the
 * dashboard. Whoever joins with a valid invite does not need the access password.
 * The token is shown only once (on creation); the database stores the SHA-256.
 */

export function hashInviteToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

export async function createRoomInvite(
  tx: DbExecutor,
  input: {
    roomId: string;
    label: string | null;
    maxUses: number | null;
    expiresAt: Date | null;
    createdBy: string;
  },
) {
  const token = randomBytes(32).toString("base64url");
  const [invite] = await tx
    .insert(roomInvites)
    .values({ ...input, tokenHash: hashInviteToken(token) })
    .returning({ id: roomInvites.id });
  if (!invite) throw new Error("convite não foi gravado");
  return { id: invite.id, token };
}

/** Revokes (whoever already joined stays in the room; new joins are refused). */
export async function revokeRoomInvite(tx: DbExecutor, id: string) {
  const [invite] = await tx
    .update(roomInvites)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(roomInvites.id, id), isNull(roomInvites.revokedAt)))
    .returning({ id: roomInvites.id, roomId: roomInvites.roomId });
  return invite ?? null;
}

/**
 * Redeems the invite for this person and this room. Atomic: two people taking
 * the last spot at the same time do not exceed the limit (row lock).
 * Whoever already used the invite comes back without spending another use.
 */
export async function redeemRoomInvite(
  db: Database,
  { token, roomCode, userId }: { token: string; roomCode: string; userId: string },
): Promise<boolean> {
  if (!INVITE_TOKEN_PATTERN.test(token)) return false;
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select({ id: roomInvites.id, uses: roomInvites.uses, maxUses: roomInvites.maxUses })
      .from(roomInvites)
      .innerJoin(rooms, eq(rooms.id, roomInvites.roomId))
      .where(
        and(
          eq(roomInvites.tokenHash, hashInviteToken(token)),
          eq(rooms.code, roomCode),
          isNull(rooms.deletedAt),
          isNull(roomInvites.revokedAt),
          isNull(roomInvites.deletedAt),
          sql`(${roomInvites.expiresAt} is null or ${roomInvites.expiresAt} > now())`,
        ),
      )
      .for("update", { of: roomInvites });
    if (!invite) return false;
    const [already] = await tx
      .select({ userId: roomInviteUses.userId })
      .from(roomInviteUses)
      .where(and(eq(roomInviteUses.inviteId, invite.id), eq(roomInviteUses.userId, userId)));
    if (already) return true;
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) return false;
    await tx.insert(roomInviteUses).values({ inviteId: invite.id, userId });
    await tx
      .update(roomInvites)
      .set({ uses: sql`${roomInvites.uses} + 1` })
      .where(eq(roomInvites.id, invite.id));
    return true;
  });
}
