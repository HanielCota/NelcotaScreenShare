import { roomCodeSchema } from "@/features/room/domain/room-code";

/**
 * Where the person came from to the access screen (via `voltar`): a room,
 * maybe through an invite, or nothing specific. It changes the screen text.
 */
export type AccessContext = { kind: "room"; code: string; invited: boolean } | { kind: "app" };

export function accessContext(returnTo: string): AccessContext {
  let url: URL;
  try {
    url = new URL(returnTo, "http://nelcota.local");
  } catch {
    return { kind: "app" };
  }
  const match = /^\/sala\/([^/]+)$/.exec(url.pathname);
  if (!match?.[1]) return { kind: "app" };
  let raw: string;
  try {
    raw = decodeURIComponent(match[1]);
  } catch {
    return { kind: "app" };
  }
  const code = roomCodeSchema.safeParse(raw);
  if (!code.success) return { kind: "app" };
  return { kind: "room", code: code.data, invited: url.searchParams.has("convite") };
}
