import { routeLoader } from "@/server/route-loader.server";
import { useLoaderData, Link } from "react-router";

import { ArrowLeft } from "lucide-react";
import { notFound } from "@/server/http.server";
import { z } from "zod";
import { Section } from "@/components/Section";
import { InvitesPanel } from "@/features/admin/rooms/ui/InvitesPanel";
import { RoomNoteForm } from "@/features/admin/rooms/ui/RoomNoteForm";
import { RoomStatus } from "@/features/admin/rooms/ui/RoomStatus";
import {
  RoomParticipants,
  RoomShares,
  RoomSummary,
} from "@/features/admin/rooms/ui/RoomDetailSections";
import { AdminHistory } from "@/features/admin/audit/ui/AdminHistory";
import { getRoomDetail } from "@/features/admin/rooms/queries.server";
import { requireAdmin } from "@/features/auth/server/admin-session.server";
import { can } from "@/features/auth/server/permissions.server";
import { getDb } from "@/server/db/index.server";

export const meta = () => [{ title: "Sala · Nelcota" }];

export const loader = routeLoader(async ({ params: routeParams }) => {
  const params = { id: routeParams.id ?? "" };

  const admin = await requireAdmin({ room: ["read"] });
  const { id } = params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = getDb();
  const detail = await getRoomDetail(db, id);
  if (!detail) notFound();
  const { room, participants, shares, invites, history } = detail;
  const role = admin.user.role;
  const live = room.status === "active" && room.deletedAt === null;
  const online = participants.filter((participant) => participant.leftAt === null).length;

  const canUpdate = can(role, { room: ["update"] });
  const canCreateInvite = can(role, { roomInvite: ["create"] });
  const canRevokeInvite = can(role, { roomInvite: ["revoke"] });
  return {
    room,
    participants,
    shares,
    invites,
    history,

    live,
    online,
    canUpdate,
    canCreateInvite,
    canRevokeInvite,
  };
});

export default function RoomPage() {
  const {
    room,
    participants,
    shares,
    invites,
    history,

    live,
    online,
    canUpdate,
    canCreateInvite,
    canRevokeInvite,
  } = useLoaderData<typeof loader>();
  return (
    <>
      <div className="flex flex-col gap-3">
        <Link
          to="/admin/salas"
          className="flex w-fit items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Salas
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-sans text-2xl font-medium tracking-tight tabular-nums">
            {room.code}
          </h1>
          <RoomStatus status={room.status} deleted={room.deletedAt !== null} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RoomSummary room={room} online={live ? online : null} shareCount={shares.length} />
        <Section title="Nota interna" description="Só o painel vê.">
          <RoomNoteForm id={room.id} note={room.note} canEdit={canUpdate} />
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
            create: canCreateInvite && room.deletedAt === null,
            revoke: canRevokeInvite,
          }}
        />
      </Section>

      <RoomParticipants participants={participants} />

      <RoomShares shares={shares} />

      <AdminHistory entries={history} />
    </>
  );
}

export { AdminErrorBoundary as ErrorBoundary } from "@/features/admin/shell/ui/AdminErrorBoundary";
