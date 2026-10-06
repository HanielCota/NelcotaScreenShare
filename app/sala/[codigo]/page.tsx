import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoomSession } from "@/components/room/RoomSession";
import { requireUser } from "@/server/auth/user-session";
import { getEnv } from "@/server/env";
import { roomCodeSchema, roomPath } from "@/lib/livekit";

export async function generateMetadata({ params }: PageProps<"/sala/[codigo]">): Promise<Metadata> {
  const { codigo } = await params;
  const code = roomCodeSchema.safeParse(decodeURIComponent(codigo));
  return { title: code.success ? `Sala ${code.data}` : "Sala" };
}

export default async function RoomPage({ params }: PageProps<"/sala/[codigo]">) {
  const { codigo } = await params;

  let raw: string;
  try {
    raw = decodeURIComponent(codigo);
  } catch {
    redirect("/?erro=codigo");
  }
  const code = roomCodeSchema.safeParse(raw);
  if (!code.success) redirect("/?erro=codigo");
  // Um só endereço por sala: "/sala/ABC-..." vira "/sala/abc-...", igual ao link copiado.
  if (code.data !== raw) redirect(roomPath(code.data));

  // Entrar em sala exige conta com e-mail confirmado; depois do login, volta para cá.
  const { user } = await requireUser(roomPath(code.data));
  const { ACCESS_PASSWORD, MAX_PARTICIPANTS } = getEnv();

  return (
    <RoomSession
      code={code.data}
      userName={user.name}
      passwordRequired={ACCESS_PASSWORD !== undefined}
      maxParticipants={MAX_PARTICIPANTS}
    />
  );
}
