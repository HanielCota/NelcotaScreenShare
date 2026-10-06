import { TimerOff } from "lucide-react";
import Link from "next/link";
import { AcceptInvitationForm } from "@/features/auth/ui/AcceptInvitationForm";
import { AuthCard } from "@/features/auth/ui/AuthCard";
import { Button } from "@/components/ui/button";
import { findPendingInvitation } from "@/features/auth/server/admin-invitations";
import { ADMIN_ROLE_LABELS, isAdminRole } from "@/features/auth/domain/roles";
import { getDb } from "@/server/db";

export default async function AcceptInvitationPage({
  params,
}: PageProps<"/admin/convite/[token]">) {
  const db = getDb();
  const { token } = await params;
  const invitation = token.length <= 200 ? await findPendingInvitation(db, token) : undefined;

  if (!invitation || !isAdminRole(invitation.role)) {
    return (
      <AuthCard
        icon={TimerOff}
        title="Convite indisponível"
        description="Este convite expirou, foi revogado ou já foi usado. Peça um novo a quem convidou você."
      >
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/admin/entrar">Ir para o login</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AcceptInvitationForm
      token={token}
      email={invitation.email}
      roleLabel={ADMIN_ROLE_LABELS[invitation.role]}
    />
  );
}
