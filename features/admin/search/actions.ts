"use server";

import { and, desc, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { adminAction } from "@/features/auth/server/action-clients";
import { can } from "@/features/auth/server/permissions";
import { getDb } from "@/server/db";
import { rooms, users } from "@/server/db/schema";
import { likeEscape, unaccentLike } from "@/server/table/search";

/**
 * Busca do command palette: salas por código e participantes por nome ou
 * e-mail, só no que o papel pode ler. Leitura pura: sem auditoria.
 */
export const searchPanelAction = adminAction
  .metadata({ name: "panel.search", audit: "none" })
  .inputSchema(z.object({ q: z.string().trim().min(2).max(60) }))
  .action(async ({ parsedInput, ctx }) => {
    const db = getDb();
    const role = ctx.admin.user.role;
    const q = parsedInput.q;
    const [foundRooms, foundPeople] = await Promise.all([
      can(role, { room: ["read"] })
        ? db
            .select({ id: rooms.id, code: rooms.code, status: rooms.status })
            .from(rooms)
            .where(
              and(
                isNull(rooms.deletedAt),
                sql`${rooms.code} like ${`%${likeEscape(q.toLowerCase())}%`}`,
              ),
            )
            .orderBy(desc(rooms.lastActivityAt))
            .limit(5)
        : [],
      can(role, { participant: ["read"] })
        ? db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(
              and(
                isNull(users.deletedAt),
                unaccentLike(sql`${users.name} || ' ' || ${users.email}`, q),
              ),
            )
            .orderBy(desc(users.lastSeenAt))
            .limit(5)
        : [],
    ]);
    return { rooms: foundRooms, people: foundPeople };
  });
