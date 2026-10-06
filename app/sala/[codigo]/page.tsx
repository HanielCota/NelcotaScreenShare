import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoomSession } from "@/components/room/RoomSession";
import { getEnv } from "@/lib/env";
import { roomCodeSchema } from "@/lib/livekit";

export async function generateMetadata({ params }: PageProps<"/sala/[codigo]">): Promise<Metadata> {
  const { codigo } = await params;
  return { title: `Sala ${decodeURIComponent(codigo)}` };
}

export default async function RoomPage({ params }: PageProps<"/sala/[codigo]">) {
  const { codigo } = await params;

  const code = roomCodeSchema.safeParse(decodeURIComponent(codigo));
  if (!code.success) redirect("/?erro=codigo");

  const { ACCESS_PASSWORD, MAX_PARTICIPANTS } = getEnv();

  return (
    <RoomSession
      code={code.data}
      passwordRequired={ACCESS_PASSWORD !== undefined}
      maxParticipants={MAX_PARTICIPANTS}
    />
  );
}
