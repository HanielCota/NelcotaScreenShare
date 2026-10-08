import { routeLoader } from "@/server/route-loader.server";

import { redirect } from "@/server/http.server";
import { requireUser } from "@/features/auth/server/participant-session.server";
import { getAdminSession } from "@/features/auth/server/admin-session.server";
import { getDb } from "@/server/db/index.server";
import { getEnv } from "@/server/env.server";
import { presenceForGuests } from "@/features/room/domain/presence";
import { roomPresence } from "@/features/room/server/presence.server";
import { decodeRoomParam, roomCodeSchema, roomLink } from "@/features/room/domain/room-code";
import { INVITE_TOKEN_PATTERN } from "@/features/room/domain/invite-token";
import type { RoomEntry } from "@/features/room/ui/ActiveRoom";

export const meta = () => [{ title: "Sala · Nelcota" }];

export const loader = routeLoader(async ({ params, searchParams }) => {
  const codigo = params.codigo ?? "";
  // Panel invite (?convite=…): format checked here, validity in /api/token.
  const { convite } = searchParams;
  const invite =
    typeof convite === "string" && INVITE_TOKEN_PATTERN.test(convite) ? convite : undefined;

  const raw = decodeRoomParam(codigo);
  if (raw === undefined) redirect("/?erro=codigo");
  const code = roomCodeSchema.safeParse(raw);
  if (!code.success) redirect("/?erro=codigo");
  // A single address per room: "/sala/ABC-..." becomes "/sala/abc-...", same as the copied link.
  if (code.data !== raw) redirect(roomLink(code.data, invite));

  // Joining a room requires an account with a confirmed e-mail; after sign-in, it comes back here.
  const { user } = await requireUser(roomLink(code.data, invite));
  const { ACCESS_PASSWORD, MAX_PARTICIPANTS } = getEnv();
  const passwordRequired = ACCESS_PASSWORD !== undefined;
  // Who is already inside, for the pre-join screen to show.
  const [roomNow, admin] = await Promise.all([roomPresence(getDb(), code.data), getAdminSession()]);
  const presence = presenceForGuests(roomNow, passwordRequired);

  return {
    invite,
    code: code.data,
    user: { name: user.name, image: user.image },
    passwordRequired,
    maxParticipants: MAX_PARTICIPANTS,
    presence,
    // Admin session in this browser: the call offers the panel without leaving the room.
    isAdmin: admin !== null,
  } satisfies RoomEntry;
});

/**
 * The session is drawn by `ActiveRoom` in the root, from this page's data: a call
 * keeps going while the person visits other pages (the admin panel).
 */
export default function RoomPage() {
  return null;
}
