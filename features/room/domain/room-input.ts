import { INVITE_TOKEN_PATTERN } from "@/lib/invite";
import { roomCodeSchema } from "@/lib/livekit";

/**
 * O que a pessoa digitou ou colou na barra da home: nada (cria uma sala),
 * uma sala (código, link inteiro com ou sem convite, ou só o caminho) ou
 * algo que não é sala.
 */
export type RoomInput =
  | { kind: "empty" }
  | { kind: "room"; code: string; invite?: string }
  | { kind: "invalid"; reason: "not-a-room" | "bad-code" };

/** Link de sala com ou sem protocolo: "https://x/sala/abc", "x.com/sala/abc", "/sala/abc". */
const ROOM_PATH = /(?:^|\/)sala\/([^/?#\s]+)/i;

export function parseRoomInput(raw: string): RoomInput {
  const text = raw.trim();
  if (!text) return { kind: "empty" };

  const pathMatch = ROOM_PATH.exec(text);
  if (pathMatch?.[1]) {
    let segment: string;
    try {
      segment = decodeURIComponent(pathMatch[1]);
    } catch {
      return { kind: "invalid", reason: "bad-code" };
    }
    const code = roomCodeSchema.safeParse(segment);
    if (!code.success) return { kind: "invalid", reason: "bad-code" };
    const invite = /[?&]convite=([^&#\s]+)/.exec(text)?.[1];
    return invite && INVITE_TOKEN_PATTERN.test(invite)
      ? { kind: "room", code: code.data, invite }
      : { kind: "room", code: code.data };
  }

  // Link de outra coisa (ou de outro site) não é sala.
  if (/^[a-z]+:\/\//i.test(text) || text.includes("/")) {
    return { kind: "invalid", reason: "not-a-room" };
  }
  const code = roomCodeSchema.safeParse(text);
  return code.success ? { kind: "room", code: code.data } : { kind: "invalid", reason: "bad-code" };
}
