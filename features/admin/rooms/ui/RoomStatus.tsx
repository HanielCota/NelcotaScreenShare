import { StatusBadge } from "@/components/StatusBadge";
import type { RoomRow } from "@/features/admin/rooms/queries";

/** Selo da sala (serve à tabela e à página da sala, que é Server Component). */
export function RoomStatus({ status, deleted }: { status: RoomRow["status"]; deleted: boolean }) {
  if (deleted) return <StatusBadge tone="neutral">Excluída</StatusBadge>;
  return status === "active" ? (
    <StatusBadge tone="live">Ao vivo</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Encerrada</StatusBadge>
  );
}
