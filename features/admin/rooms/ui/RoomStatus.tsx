import { StatusBadge } from "@/components/StatusBadge";
import type { RoomRow } from "@/features/admin/rooms/queries.server";

/** Selo da sala, compartilhado pela tabela e pela página de detalhes. */
export function RoomStatus({ status, deleted }: { status: RoomRow["status"]; deleted: boolean }) {
  if (deleted) return <StatusBadge tone="neutral">Excluída</StatusBadge>;
  return status === "active" ? (
    <StatusBadge tone="live">Ao vivo</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Encerrada</StatusBadge>
  );
}
