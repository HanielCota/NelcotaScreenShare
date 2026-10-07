/** Public profile details for people already in the room. */
export interface RoomPresence {
  online: number;
  participants: {
    id: string;
    name: string;
    image: string | null;
  }[];
}

/**
 * Only how many are inside. With the access password on, names and photos stay
 * hidden from whoever has not given it yet (the call shows them once inside).
 */
export function presenceForGuests(presence: RoomPresence, passwordRequired: boolean): RoomPresence {
  if (!passwordRequired) return presence;
  return { online: presence.online, participants: [] };
}
