import { AccessToken, RoomConfiguration, ServerError, TrackSource } from "livekit-server-sdk";
import type { TokenGrant } from "@/features/room/domain/issue-token";
import { getEnv } from "@/server/env.server";
import { roomService } from "./room-service.server";

const TOKEN_TTL = "10m";

/** O app só usa microfone e tela: o token não deixa publicar câmera. */
const PUBLISH_SOURCES = [
  TrackSource.MICROPHONE,
  TrackSource.SCREEN_SHARE,
  TrackSource.SCREEN_SHARE_AUDIO,
];

/** O que a emissão do token precisa do LiveKit (nos testes, um objeto literal). */
export interface LiveKitGateway {
  countParticipants: (room: string) => Promise<number>;
  signToken: (grant: TokenGrant) => Promise<string>;
}

export const liveKitGateway: LiveKitGateway = {
  async countParticipants(room) {
    try {
      const participants = await roomService().listParticipants(room);
      return participants.length;
    } catch (error) {
      // Sala ainda não existe: ninguém dentro.
      if (error instanceof ServerError && error.status === 404) return 0;
      throw error;
    }
  },

  async signToken({ identity, name, room }) {
    const env = getEnv();
    // Identidade = conta: a mesma pessoa em duas abas ocupa um só lugar na sala
    // (o LiveKit desconecta a conexão anterior) e os eventos ligam na conta certa.
    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity,
      name,
      ttl: TOKEN_TTL,
    });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canPublishSources: PUBLISH_SOURCES,
      canSubscribe: true,
      // Chat, reações e apontador usam o canal de dados.
      canPublishData: true,
      // Sem canUpdateOwnMetadata: ele deixaria trocar o próprio nome na sala.
      // "Levantar a mão" passa pelo servidor (/api/sala/mao).
    });
    // Rede de segurança: o próprio LiveKit recusa entradas acima do limite.
    token.roomConfig = new RoomConfiguration({ maxParticipants: env.MAX_PARTICIPANTS });
    return token.toJwt();
  },
};
