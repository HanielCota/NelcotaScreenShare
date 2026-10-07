import "server-only";
import { RoomServiceClient } from "livekit-server-sdk";
import { getEnv } from "@/server/env";

function httpUrlFrom(wsUrl: string): string {
  const url = new URL(wsUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  return url.origin;
}

/** API de administração do LiveKit (mesmas chaves do token). */
export function roomService(): RoomServiceClient {
  const env = getEnv();
  return new RoomServiceClient(
    httpUrlFrom(env.NEXT_PUBLIC_LIVEKIT_URL),
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );
}
