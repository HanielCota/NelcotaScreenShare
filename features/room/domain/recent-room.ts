/** Room the person has been in before (home: "Suas salas recentes"). */
export interface RecentRoom {
  code: string;
  live: boolean;
  /** People in the room now (only meaningful if `live`). */
  online: number;
  lastJoinedAt: string;
}
