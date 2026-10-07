/** Public profile details for people already in the room. */
export interface RoomPresence {
  online: number;
  participants: {
    id: string;
    name: string;
    image: string | null;
  }[];
}
