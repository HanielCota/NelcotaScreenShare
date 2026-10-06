import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoomSession } from "@/components/room/RoomSession";
import { requireUser } from "@/server/auth/user-session";
import { getEnv } from "@/server/env";
import { roomCodeSchema, roomLink } from "@/lib/livekit";
import { INVITE_TOKEN_PATTERN } from "@/lib/invite";

export async function generateMetadata({ params }: PageProps<"/sala/[codigo]">): Promise<Metadata> {
  const { codigo } = await params;
  const code = roomCodeSchema.safeParse(decodeURIComponent(codigo));
  return { title: code.success ? `Sala ${code.data}` : "Sala" };
}

export default async function RoomPage({ params, searchParams }: PageProps<"/sala/[codigo]">) {
  const { codigo } = await params;
  // Convite do painel (?convite=…): formato conferido aqui, validade no /api/token.
  const { convite } = await searchParams;
  const invite =
    typeof convite === "string" && INVITE_TOKEN_PATTERN.test(convite) ? convite : undefined;

  let raw: string;
  try {
    raw = decodeURIComponent(codigo);
  } catch {
    redirect("/?erro=codigo");
  }
  const code = roomCodeSchema.safeParse(raw);
  if (!code.success) redirect("/?erro=codigo");
  // Um só endereço por sala: "/sala/ABC-..." vira "/sala/abc-...", igual ao link copiado.
  if (code.data !== raw) redirect(roomLink(code.data, invite));

  // Entrar em sala exige conta com e-mail confirmado; depois do login, volta para cá.
  const { user } = await requireUser(roomLink(code.data, invite));
  const { ACCESS_PASSWORD, MAX_PARTICIPANTS } = getEnv();

  return (
    <RoomSession
      code={code.data}
      userName={user.name}
      passwordRequired={ACCESS_PASSWORD !== undefined}
      invite={invite}
      maxParticipants={MAX_PARTICIPANTS}
    />
  );
}
