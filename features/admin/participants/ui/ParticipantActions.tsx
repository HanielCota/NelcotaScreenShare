import { Ban, LockOpen, LogOut, MailCheck, RotateCcw, ShieldX, Trash2 } from "lucide-react";
import { useOperation } from "@/lib/operations/use-operation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toastWithUndo } from "@/lib/undo-toast";
import { Button } from "@/components/ui/button";
import {
  anonymizeParticipantAction,
  blockParticipantsAction,
  deleteParticipantsAction,
  resendVerificationAction,
  restoreParticipantsAction,
  revokeParticipantSessionsAction,
  unblockParticipantsAction,
} from "@/features/admin/participants/actions";
import type { ParticipantStatus } from "@/features/admin/participants/domain/search-params";
import { availableActions } from "@/features/admin/participants/domain/available-actions";
import { BLOCK_DESCRIPTION } from "@/features/admin/participants/domain/labels";
import { toastError } from "@/features/admin/shell/ui/toast-error";

type Dialog = "block" | "delete" | "anonymize" | null;

/** Actions on a participant's detail page, according to status and permissions. */
export function ParticipantActions({
  id,
  status,
  verified,
  anonymized,
  sessions,
  can,
}: {
  id: string;
  status: ParticipantStatus;
  verified: boolean;
  anonymized: boolean;
  sessions: number;
  can: { update: boolean; delete: boolean; anonymize: boolean };
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const selection = { kind: "ids" as const, ids: [id] };
  const block = useOperation(blockParticipantsAction, {
    onSuccess: () => {
      setDialog(null);
      toast.success("Conta bloqueada. Sessões encerradas.");
    },
    onError: toastError("Não foi possível bloquear."),
  });
  const unblock = useOperation(unblockParticipantsAction, {
    onSuccess: () => toast.success("Conta desbloqueada."),
    onError: toastError("Não foi possível desbloquear."),
  });
  const revoke = useOperation(revokeParticipantSessionsAction, {
    onSuccess: ({ data }) =>
      toast.success(data.count === 1 ? "1 sessão encerrada." : `${data.count} sessões encerradas.`),
    onError: toastError("Não foi possível encerrar as sessões."),
  });
  const resend = useOperation(resendVerificationAction, {
    onSuccess: () => toast.success("Link de confirmação reenviado."),
    onError: toastError("Não foi possível reenviar."),
  });
  const restore = useOperation(restoreParticipantsAction, {
    onSuccess: () => toast.success("Conta restaurada."),
    onError: toastError("Não foi possível restaurar."),
  });
  const remove = useOperation(deleteParticipantsAction, {
    onSuccess: ({ data }) => {
      setDialog(null);
      toastWithUndo(
        "Conta excluída",
        () => restoreParticipantsAction({ ids: data.ids }),
        "Conta restaurada.",
      );
    },
    onError: toastError("Não foi possível excluir."),
  });
  const anonymize = useOperation(anonymizeParticipantAction, {
    onSuccess: () => {
      setDialog(null);
      toast.success("Conta anonimizada.");
    },
    onError: toastError("Não foi possível anonimizar."),
  });

  const show = availableActions({ status, verified, anonymized, sessions, can });
  return (
    <div className="flex flex-wrap gap-2">
      {show.unblock ? (
        <Button
          variant="outline"
          disabled={unblock.isPending}
          onClick={() => unblock.execute({ selection })}
        >
          <LockOpen aria-hidden="true" />
          Desbloquear
        </Button>
      ) : null}
      {show.block ? (
        <Button variant="outline" onClick={() => setDialog("block")}>
          <Ban aria-hidden="true" />
          Bloquear
        </Button>
      ) : null}
      {show.revokeSessions ? (
        <Button
          variant="outline"
          disabled={revoke.isPending}
          onClick={() => revoke.execute({ id })}
        >
          <LogOut aria-hidden="true" />
          Encerrar sessões
        </Button>
      ) : null}
      {show.resendVerification ? (
        <Button
          variant="outline"
          disabled={resend.isPending}
          onClick={() => resend.execute({ id })}
        >
          <MailCheck aria-hidden="true" />
          Reenviar verificação
        </Button>
      ) : null}
      {show.restore ? (
        <Button
          variant="outline"
          disabled={restore.isPending}
          onClick={() => restore.execute({ ids: [id] })}
        >
          <RotateCcw aria-hidden="true" />
          Restaurar
        </Button>
      ) : null}
      {show.delete ? (
        <Button variant="destructive" onClick={() => setDialog("delete")}>
          <Trash2 aria-hidden="true" />
          Excluir
        </Button>
      ) : null}
      {show.anonymize ? (
        <Button variant="destructive" onClick={() => setDialog("anonymize")}>
          <ShieldX aria-hidden="true" />
          Anonimizar (LGPD)
        </Button>
      ) : null}

      <ConfirmDialog
        open={dialog === "block"}
        onOpenChange={(open) => setDialog(open ? "block" : null)}
        title="Bloquear esta conta?"
        description={BLOCK_DESCRIPTION}
        confirmLabel="Bloquear"
        danger
        pending={block.isPending}
        reason={{ label: "Motivo (fica no histórico)", maxLength: 300 }}
        onConfirm={(reason) => block.execute({ selection, reason })}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title="Excluir esta conta?"
        description="A conta some das listas e não entra mais. Dá para desfazer logo depois ou restaurar aqui mesmo."
        confirmLabel="Excluir"
        danger
        pending={remove.isPending}
        onConfirm={() => remove.execute({ selection })}
      />
      <ConfirmDialog
        open={dialog === "anonymize"}
        onOpenChange={(open) => setDialog(open ? "anonymize" : null)}
        title="Anonimizar esta conta?"
        description="Irreversível. Nome e e-mail viram valores sem dados pessoais, senha, 2FA e sessões são apagados e o nome sai do histórico de salas. Os IPs ficam até a retenção de 6 meses (Marco Civil)."
        confirmLabel="Anonimizar para sempre"
        danger
        pending={anonymize.isPending}
        typedConfirmation="ANONIMIZAR"
        onConfirm={() => anonymize.execute({ id, confirmation: "ANONIMIZAR" })}
      />
    </div>
  );
}
