import { StatusBadge } from "@/components/StatusBadge";
import { roomStatus, STATUS_LABELS } from "@/features/admin/rooms/domain/labels";
import type { RoomRow } from "@/features/admin/rooms/server/queries.server";

/** Room badge, shared by the table and the details page. */
export function RoomStatus({ status, deleted }: { status: RoomRow["status"]; deleted: boolean }) {
  const label = STATUS_LABELS[roomStatus({ status, deleted })];
  return <StatusBadge tone={label.tone}>{label.label}</StatusBadge>;
}
