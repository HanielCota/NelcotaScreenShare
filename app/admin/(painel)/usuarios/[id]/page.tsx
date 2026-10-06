import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Facts, Section } from "@/components/Section";
import { StatusBadge } from "@/components/StatusBadge";
import { ParticipantActions } from "@/features/admin/participants/ui/ParticipantActions";
import { STATUS_LABELS } from "@/features/admin/participants/labels";
import { getParticipantDetail } from "@/features/admin/participants/queries";
import { actionLabel, LEAVE_REASON_LABELS } from "@/features/admin/audit/labels";
import { formatDateTime, formatNumber, formatSpan } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";
import { requireAdmin } from "@/features/auth/server/admin-session";
import { can } from "@/features/auth/server/permissions";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Participante" };

export default async function ParticipantPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  const admin = await requireAdmin({ participant: ["read"] });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = getDb();
  const detail = await getParticipantDetail(db, id);
  if (!detail) notFound();
  const { account, sessions, timeline, history } = detail;
  const role = admin.user.role;
  const status = STATUS_LABELS[account.status];

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/usuarios"
          className="flex w-fit items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Participantes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <p className="text-ink-muted">{account.email}</p>
        <ParticipantActions
          id={account.id}
          status={account.status}
          verified={account.emailVerified}
          anonymized={account.anonymizedAt !== null}
          sessions={sessions.length}
          can={{
            update: can(role, { participant: ["update"] }),
            delete: can(role, { participant: ["delete"] }),
            anonymize: can(role, { participant: ["anonymize"] }),
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
      </div>

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
                        href={`/admin/salas/${item.roomId}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {item.roomCode}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(item.joinedAt)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatSpan(item.joinedAt, item.leftAt)}
                    </td>
                    <td className="py-2 pr-4 text-ink-muted">
                      {item.leaveReason
                        ? (LEAVE_REASON_LABELS[item.leaveReason] ?? "—")
                        : "Na sala"}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {item.shares === 0 ? "—" : `${item.shares}×`}
                    </td>
                    <td className="py-2 font-mono text-xs">{item.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>

      <Section
        title="Histórico no painel"
        description={history.length === 0 ? "Nenhuma ação do painel nesta conta." : undefined}
      >
        {history.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line text-sm">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{actionLabel(entry.action)}</span>
                  {typeof entry.metadata.motivo === "string" ? (
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
    </>
  );
}
