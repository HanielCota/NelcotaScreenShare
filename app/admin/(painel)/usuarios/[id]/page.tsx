import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/StatusBadge";
import { ParticipantActions } from "@/features/admin/participants/ui/ParticipantActions";
import { STATUS_LABELS } from "@/features/admin/participants/labels";
import {
  ParticipantAccount,
  ParticipantSessions,
  ParticipantTimeline,
} from "@/features/admin/participants/ui/ParticipantDetailSections";
import { AdminHistory } from "@/features/admin/audit/ui/AdminHistory";
import { getParticipantDetail } from "@/features/admin/participants/queries";
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
        <ParticipantAccount account={account} />
        <ParticipantSessions sessions={sessions} />
      </div>

      <ParticipantTimeline timeline={timeline} />

      <AdminHistory entries={history} emptyMessage="Nenhuma ação do painel nesta conta." />
    </>
  );
}
