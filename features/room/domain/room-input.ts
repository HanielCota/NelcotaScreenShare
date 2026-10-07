import { INVITE_TOKEN_PATTERN } from "./invite-token";
import { roomCodeSchema } from "@/features/room/domain/room-code";

/**
 * What the person typed or pasted into the home page bar: nothing (creates a room),
 * a room (code, full link with or without invite, or just the path) or
 * something that is not a room.
 */
export type RoomInput =
  | { kind: "empty" }
  | { kind: "room"; code: string; invite?: string }
  | { kind: "invalid"; reason: "not-a-room" | "bad-code" };

/** Room link with or without protocol: "https://x/sala/abc", "x.com/sala/abc", "/sala/abc". */
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

  // A link to something else (or another site) is not a room.
  if (/^[a-z]+:\/\//i.test(text) || text.includes("/")) {
    return { kind: "invalid", reason: "not-a-room" };
  }
  const code = roomCodeSchema.safeParse(text);
  return code.success ? { kind: "room", code: code.data } : { kind: "invalid", reason: "bad-code" };
}
