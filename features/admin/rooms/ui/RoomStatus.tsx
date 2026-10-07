import { StatusBadge } from "@/components/StatusBadge";
import type { RoomRow } from "@/features/admin/rooms/server/queries.server";

/** Room badge, shared by the table and the details page. */
export function RoomStatus({ status, deleted }: { status: RoomRow["status"]; deleted: boolean }) {
  if (deleted) return <StatusBadge tone="neutral">Excluída</StatusBadge>;
  return status === "active" ? (
    <StatusBadge tone="live">Ao vivo</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Encerrada</StatusBadge>
  );
}
