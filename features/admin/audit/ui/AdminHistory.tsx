import { Section } from "@/components/Section";
import { actionLabel } from "@/features/admin/audit/domain/labels";
import { formatDateTime } from "@/lib/format";

interface HistoryEntry {
  id: string;
  action: string;
  adminName: string | null;
  createdAt: Date | string;
  metadata?: Record<string, unknown>;
}

/**
 * "Histórico no painel" of a room or account: what the admins did to it.
 * Without `emptyMessage`, the section is hidden when there is nothing.
 */
export function AdminHistory({
  entries,
  emptyMessage,
}: {
  entries: HistoryEntry[];
  emptyMessage?: string;
}) {
  if (entries.length === 0 && !emptyMessage) return null;
  return (
    <Section
      title="Histórico no painel"
      description={entries.length === 0 ? emptyMessage : undefined}
    >
      {entries.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{actionLabel(entry.action)}</span>
                {typeof entry.metadata?.motivo === "string" ? (
                  <span className="text-ink-muted"> · {entry.metadata.motivo}</span>
                ) : null}
              </span>
              <span className="text-ink-muted">
                {entry.adminName ?? "Sistema"} · {formatDateTime(entry.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
