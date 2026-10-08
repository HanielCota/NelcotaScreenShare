import { Link } from "react-router";
import { Facts, Section } from "@/components/Section";
import { LEAVE_REASON_LABELS } from "@/features/admin/audit/domain/labels";
import type { getRoomDetail } from "@/features/admin/rooms/server/queries.server";
import { formatDateTime, formatSpan } from "@/lib/format";

type RoomDetail = NonNullable<Awaited<ReturnType<typeof getRoomDetail>>>;

/** Room summary: times, duration, peak, who created it. */
export function RoomSummary({
  room,
  online,
  shareCount,
}: {
  room: RoomDetail["room"];
  /** People in the room right now (only while the room is live). */
  online: number | null;
  shareCount: number;
}) {
  return (
    <Section title="Resumo">
      <Facts
        items={[
          ["Início", formatDateTime(room.startedAt)],
          ["Fim", room.finishedAt ? formatDateTime(room.finishedAt) : "—"],
          ["Duração", formatSpan(room.startedAt, room.finishedAt)],
          ["Pico de pessoas", String(room.peak)],
          ...(online === null
            ? []
            : ([["Na sala agora", String(online)]] satisfies [string, string][])),
          ["Compartilhamentos", String(shareCount)],
          [
            "Criada por",
            room.createdById ? (
              <Link
                viewTransition
                key="criador"
                to={`/admin/usuarios/${room.createdById}`}
                className="hover:underline"
              >
                {room.createdByName ?? "Participante"}
              </Link>
            ) : (
              "—"
            ),
          ],
          ...(room.deletedAt
            ? ([["Excluída em", formatDateTime(room.deletedAt)]] satisfies [string, string][])
            : []),
        ]}
      />
    </Section>
  );
}

/** Who joined, when, and why they left. */
export function RoomParticipants({ participants }: { participants: RoomDetail["participants"] }) {
  return (
    <Section
      title="Participantes"
      description={participants.length === 0 ? "Ninguém entrou nesta sala." : undefined}
    >
      {participants.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-subtle">
              <tr>
                <th className="py-2 pr-4 font-medium">Pessoa</th>
                <th className="py-2 pr-4 font-medium">Entrou</th>
                <th className="py-2 pr-4 font-medium">Saiu</th>
                <th className="py-2 pr-4 font-medium">Duração</th>
                <th className="py-2 font-medium">Saída</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id} className="border-t border-line">
                  <td className="py-2 pr-4">
                    {participant.userId ? (
                      <Link
                        viewTransition
                        to={`/admin/usuarios/${participant.userId}`}
                        className="hover:underline"
                      >
                        {participant.name}
                      </Link>
                    ) : (
                      participant.name
                    )}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {formatDateTime(participant.joinedAt)}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {participant.leftAt ? formatDateTime(participant.leftAt) : "—"}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {formatSpan(participant.joinedAt, participant.leftAt)}
                  </td>
                  <td className="py-2 text-ink-muted">
                    {participant.leaveReason
                      ? (LEAVE_REASON_LABELS[participant.leaveReason] ?? "—")
                      : "Na sala"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Section>
  );
}

/** The room's screen shares, with duration and audio. */
export function RoomShares({ shares }: { shares: RoomDetail["shares"] }) {
  return (
    <Section
      title="Compartilhamentos de tela"
      description={shares.length === 0 ? "Ninguém compartilhou a tela." : undefined}
    >
      {shares.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {shares.map((share) => (
            <li key={share.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="font-medium">
                {share.name}
                {share.withAudio ? <span className="text-ink-muted"> · com áudio</span> : null}
              </span>
              <span className="text-ink-muted">
                {formatDateTime(share.startedAt)} · {formatSpan(share.startedAt, share.endedAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
