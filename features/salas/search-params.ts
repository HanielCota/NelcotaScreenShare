import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { pageParsers } from "@/lib/table-params";

export const ROOM_STATUSES = ["ativa", "encerrada", "excluida"] as const;
export type RoomStatusFilter = (typeof ROOM_STATUSES)[number];

export const ROOM_SORTS = ["atividade", "inicio", "pico"] as const;

/** Estado da lista de salas na URL. */
export const roomParsers = {
  ...pageParsers,
  /** Parte do código da sala. */
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(ROOM_STATUSES),
  por: parseAsStringLiteral(ROOM_SORTS).withDefault("atividade"),
  /** Período de início em dias de São Paulo: AAAA-MM-DD. */
  de: parseAsString,
  ate: parseAsString,
};

export const loadRoomParams = createLoader(roomParsers);
export type RoomParams = Awaited<ReturnType<typeof loadRoomParams>>;
