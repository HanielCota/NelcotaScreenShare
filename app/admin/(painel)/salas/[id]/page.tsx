import { ArrowLeft, Radio } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Facts, Section } from "@/components/admin/Section";
import { InvitesPanel } from "@/features/salas/components/InvitesPanel";
import { RoomNoteForm } from "@/features/salas/components/RoomNoteForm";
import { RoomStatus } from "@/features/salas/components/RoomsTable";
import { getRoomDetail } from "@/features/salas/queries";
import { actionLabel, LEAVE_REASON_LABELS } from "@/lib/audit-labels";
import { formatDateTime, formatSpan } from "@/lib/format";
import { requireAdmin } from "@/server/auth/admin-session";
import { can } from "@/server/auth/permissions";
import { getDb } from "@/server/db";

export const metadata: Metadata = { title: "Sala" };

export default async function RoomPage({ params }: PageProps<"/admin/salas/[id]">) {
  const admin = await requireAdmin({ room: ["read"] });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = getDb();
  if (!db) throw new Error("Banco indisponível");
  const detail = await getRoomDetail(db, id);
  if (!detail) notFound();
  const { room, participants, shares, invites, history } = detail;
  const role = admin.user.role;
  const live = room.status === "active" && room.deletedAt === null;
  const online = participants.filter((participant) => participant.leftAt === null).length;

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/salas"
          className="flex w-fit items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Salas
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold tracking-tight">{room.code}</h1>
          <RoomStatus status={room.status} deleted={room.deletedAt !== null} />
          {live && can(role, { live: ["read"] }) ? (
            <Link
              href={`/admin/ao-vivo/${room.code}`}
              className="flex items-center gap-1 text-sm font-semibold text-brand-soft hover:underline"
            >
              <Radio className="size-4" aria-hidden="true" />
              Acompanhar ao vivo
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Resumo">
          <Facts
            items={[
              ["Início", formatDateTime(room.startedAt)],
              ["Fim", room.finishedAt ? formatDateTime(room.finishedAt) : "—"],
              ["Duração", formatSpan(room.startedAt, room.finishedAt)],
              ["Pico de pessoas", String(room.peak)],
              ...(live ? ([["Na sala agora", String(online)]] as [string, string][]) : []),
              ["Compartilhamentos", String(shares.length)],
              [
                "Criada por",
                room.createdById ? (
                  <Link
                    key="criador"
                    href={`/admin/usuarios/${room.createdById}`}
                    className="hover:underline"
                  >
                    {room.createdByName ?? "Participante"}
                  </Link>
                ) : (
                  "—"
                ),
              ],
              ...(room.deletedAt
                ? ([["Excluída em", formatDateTime(room.deletedAt)]] as [string, string][])
                : []),
            ]}
          />
        </Section>
        <Section title="Nota interna" description="Só o painel vê.">
          <RoomNoteForm id={room.id} note={room.note} canEdit={can(role, { room: ["update"] })} />
        </Section>
      </div>

      <Section
        title="Convites"
        description="Links com validade ou limite de pessoas. Quem entra por um convite não precisa da senha de acesso."
      >
        <InvitesPanel
          roomId={room.id}
          invites={invites.map((invite) => ({
            ...invite,
            expiresAt: invite.expiresAt?.toISOString() ?? null,
            revokedAt: invite.revokedAt?.toISOString() ?? null,
            createdAt: invite.createdAt.toISOString(),
          }))}
          can={{
            create: can(role, { roomInvite: ["create"] }) && room.deletedAt === null,
            revoke: can(role, { roomInvite: ["revoke"] }),
          }}
        />
      </Section>

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
                          href={`/admin/usuarios/${participant.userId}`}
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

      {history.length > 0 ? (
        <Section title="Histórico no painel">
          <ul className="flex flex-col divide-y divide-line text-sm">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-medium">{actionLabel(entry.action)}</span>
                <span className="text-ink-muted">
                  {entry.adminName ?? "Sistema"} · {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
