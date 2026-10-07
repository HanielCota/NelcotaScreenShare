import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData } from "react-router";

import { redirect } from "@/server/http.server";
import { RoomSession } from "@/features/room/ui/RoomSession";
import { requireUser } from "@/features/auth/server/participant-session.server";
import { getDb } from "@/server/db/index.server";
import { getEnv } from "@/server/env.server";
import { roomPresence } from "@/features/room/server/presence.server";
import { decodeRoomParam, roomCodeSchema, roomLink } from "@/features/room/domain/room-code";
import { INVITE_TOKEN_PATTERN } from "@/features/room/domain/invite-token";

export const meta = () => [{ title: "Sala · Nelcota" }];

export const loader = routeLoader(async ({ params: routeParams, searchParams }) => {
  const params = { codigo: routeParams.codigo ?? "" };

  const { codigo } = params;
  // Convite do painel (?convite=…): formato conferido aqui, validade no /api/token.
  const { convite } = searchParams;
  const invite =
    typeof convite === "string" && INVITE_TOKEN_PATTERN.test(convite) ? convite : undefined;

  const raw = decodeRoomParam(codigo);
  if (raw === undefined) redirect("/?erro=codigo");
  const code = roomCodeSchema.safeParse(raw);
  if (!code.success) redirect("/?erro=codigo");
  // Um só endereço por sala: "/sala/ABC-..." vira "/sala/abc-...", igual ao link copiado.
  if (code.data !== raw) redirect(roomLink(code.data, invite));

  // Entrar em sala exige conta com e-mail confirmado; depois do login, volta para cá.
  const { user } = await requireUser(roomLink(code.data, invite));
  const { ACCESS_PASSWORD, MAX_PARTICIPANTS } = getEnv();
  // Quem já está lá dentro, para a pré-entrada mostrar.
  const presence = await roomPresence(getDb(), code.data);

  return {
    invite,
    code: code.data,
    user: { name: user.name, image: user.image },
    passwordRequired: ACCESS_PASSWORD !== undefined,
    maxParticipants: MAX_PARTICIPANTS,
    presence,
  };
});

export default function RoomPage() {
  const { invite, code, user, passwordRequired, maxParticipants, presence } =
    useLoaderData<typeof loader>();
  return (
    <RoomSession
      code={code}
      userName={user.name}
      userImage={user.image}
      passwordRequired={passwordRequired}
      invite={invite}
      maxParticipants={maxParticipants}
      presence={presence}
    />
  );
}
