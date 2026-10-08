import type { BadgeTone } from "@/components/StatusBadge";
import { ROOM_STATUSES, type RoomStatus } from "./search-params";

/** `filter`: the plural shown in the status filter. */
export const STATUS_LABELS: Record<RoomStatus, { label: string; filter: string; tone: BadgeTone }> =
  {
    ativa: { label: "Ao vivo", filter: "Ao vivo", tone: "live" },
    encerrada: { label: "Encerrada", filter: "Encerradas", tone: "neutral" },
    excluida: { label: "Excluída", filter: "Excluídas", tone: "neutral" },
  };

export const STATUS_OPTIONS = ROOM_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value].filter,
}));

/** A deleted room shows as deleted whatever its LiveKit status. */
export function roomStatus(room: { status: "active" | "finished"; deleted: boolean }): RoomStatus {
  if (room.deleted) return "excluida";
  if (room.status === "active") return "ativa";
  return "encerrada";
}
