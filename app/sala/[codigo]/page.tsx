import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoomSession } from "@/features/room/ui/RoomSession";
import { requireUser } from "@/features/auth/server/participant-session";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { roomPresence } from "@/features/room/server/presence";
import { decodeRoomParam, roomCodeSchema, roomLink } from "@/features/room/domain/room-code";
import { INVITE_TOKEN_PATTERN } from "@/features/room/domain/invite-token";

export async function generateMetadata({ params }: PageProps<"/sala/[codigo]">): Promise<Metadata> {
  const { codigo } = await params;
  const code = roomCodeSchema.safeParse(decodeRoomParam(codigo));
  return { title: code.success ? `Sala ${code.data}` : "Sala" };
}

export default async function RoomPage({ params, searchParams }: PageProps<"/sala/[codigo]">) {
  const { codigo } = await params;
  // Convite do painel (?convite=…): formato conferido aqui, validade no /api/token.
  const { convite } = await searchParams;
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

  return (
    <RoomSession
      code={code.data}
      userName={user.name}
      passwordRequired={ACCESS_PASSWORD !== undefined}
      invite={invite}
      maxParticipants={MAX_PARTICIPANTS}
      presence={presence}
    />
  );
}
