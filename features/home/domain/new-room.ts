import { generateRoomCode, roomPath } from "@/features/room/domain/room-code";

/**
 * Where "Criar sala" goes: a new room with an account; without one, the sign-up page first
 * (a room only opens with someone signed in; guests join rooms that are already open).
 */
export function newRoomHref(signedIn: boolean): string {
  const room = roomPath(generateRoomCode());
  if (signedIn) return room;
  return `/cadastro?voltar=${encodeURIComponent(room)}`;
}
