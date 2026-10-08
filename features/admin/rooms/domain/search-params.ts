import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { pageParsers, periodParsers } from "@/lib/table-params";

export const ROOM_STATUSES = ["ativa", "encerrada", "excluida"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

const ROOM_SORTS = ["atividade", "inicio", "pico"] as const;

/** Room list state in the URL. */
export const roomParsers = {
  ...pageParsers,
  /** Part of the room code. */
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(ROOM_STATUSES),
  por: parseAsStringLiteral(ROOM_SORTS).withDefault("atividade"),
  ...periodParsers,
};

export const loadRoomParams = createLoader(roomParsers);
export type RoomParams = Awaited<ReturnType<typeof loadRoomParams>>;
