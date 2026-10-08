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
 * Only how many are inside, for whoever has not proven access yet: names and photos stay
 * hidden behind the access password and from visitors without an account (the call shows
 * them once inside).
 */
export function presenceForGuests(presence: RoomPresence, hidePeople: boolean): RoomPresence {
  if (!hidePeople) return presence;
  return { online: presence.online, participants: [] };
}
