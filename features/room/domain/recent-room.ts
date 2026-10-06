/** Sala em que a pessoa já esteve (home: "Suas salas recentes"). */
export interface RecentRoom {
  code: string;
  live: boolean;
  /** Pessoas na sala agora (só faz sentido se `live`). */
  online: number;
  lastJoinedAt: string;
}
