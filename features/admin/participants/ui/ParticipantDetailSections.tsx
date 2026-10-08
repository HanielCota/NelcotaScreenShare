import { Link } from "react-router";
import { Facts, Section } from "@/components/Section";
import { LEAVE_REASON_LABELS } from "@/features/admin/audit/domain/labels";
import type { getParticipantDetail } from "@/features/admin/participants/server/queries.server";
import { formatDateTime, formatNumber, formatSpan } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";

type ParticipantDetail = NonNullable<Awaited<ReturnType<typeof getParticipantDetail>>>;

/** Account data: sign-up, access, 2FA, blocking and anonymization. */
export function ParticipantAccount({ account }: { account: ParticipantDetail["account"] }) {
  return (
    <Section title="Conta">
      <Facts
        items={[
          ["Cadastro", formatDateTime(account.createdAt)],
          ["Último acesso", account.lastSeenAt ? formatDateTime(account.lastSeenAt) : "Nunca"],
          ["E-mail confirmado", account.emailVerified ? "Sim" : "Não"],
          ["Verificação em 2 etapas", account.twoFactorEnabled ? "Ativa" : "Desligada"],
          ["Participações", formatNumber(account.participations)],
          ...(account.blockedAt
            ? ([
                ["Bloqueada em", formatDateTime(account.blockedAt)],
                ["Motivo", account.blockReason ?? "—"],
              ] as [string, string][])
            : []),
          ...(account.anonymizedAt
            ? ([["Anonimizada em", formatDateTime(account.anonymizedAt)]] as [string, string][])
            : []),
        ]}
      />
    </Section>
  );
}

/** Where the account is signed in right now. */
export function ParticipantSessions({ sessions }: { sessions: ParticipantDetail["sessions"] }) {
  return (
    <Section
      title="Sessões ativas"
      description={sessions.length === 0 ? "Nenhuma sessão aberta." : undefined}
    >
      {sessions.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-col py-2">
              <span className="font-medium">{describeUserAgent(session.userAgent)}</span>
              <span className="text-ink-muted">
                {session.ipAddress ?? "IP desconhecido"} · entrou em{" "}
                {formatDateTime(session.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

/** Rooms the person joined (the 100 most recent). */
export function ParticipantTimeline({ timeline }: { timeline: ParticipantDetail["timeline"] }) {
  return (
    <Section
      title="Participações"
      description={
        timeline.length === 0
          ? "Ainda não entrou em nenhuma sala."
          : timeline.length === 100
            ? "As 100 mais recentes."
            : undefined
      }
    >
      {timeline.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-subtle">
              <tr>
                <th className="py-2 pr-4 font-medium">Sala</th>
                <th className="py-2 pr-4 font-medium">Entrou</th>
                <th className="py-2 pr-4 font-medium">Duração</th>
                <th className="py-2 pr-4 font-medium">Saída</th>
                <th className="py-2 pr-4 font-medium">Compartilhou</th>
                <th className="py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="py-2 pr-4">
                    <Link
                      viewTransition
                      to={`/admin/salas/${item.roomId}`}
                      className="font-sans text-xs tabular-nums hover:underline"
                    >
                      {item.roomCode}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(item.joinedAt)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {formatSpan(item.joinedAt, item.leftAt)}
                  </td>
                  <td className="py-2 pr-4 text-ink-muted">
                    {item.leaveReason ? (LEAVE_REASON_LABELS[item.leaveReason] ?? "—") : "Na sala"}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {item.shares === 0 ? "—" : `${item.shares}×`}
                  </td>
                  <td className="py-2 font-sans text-xs tabular-nums">{item.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Section>
  );
}
