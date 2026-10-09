import { useOperation } from "@/lib/operations/use-operation";
import { toast } from "sonner";
import { toastWithUndo } from "@/lib/undo-toast";
import {
  anonymizeParticipantAction,
  blockParticipantsAction,
  deleteParticipantsAction,
  resendVerificationAction,
  restoreParticipantsAction,
  revokeParticipantSessionsAction,
  unblockParticipantsAction,
} from "@/features/admin/participants/actions";
import { toastError } from "@/features/admin/shell/ui/toast-error";

/** Operations of the participant detail page; `closeDialog` runs after a confirmed one succeeds. */
export function useParticipantOperations(closeDialog: () => void) {
  const block = useOperation(blockParticipantsAction, {
    onSuccess: () => {
      closeDialog();
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
      closeDialog();
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
      closeDialog();
      toast.success("Conta anonimizada.");
    },
    onError: toastError("Não foi possível anonimizar."),
  });
  return { block, unblock, revoke, resend, restore, remove, anonymize };
}

export type ParticipantOperations = ReturnType<typeof useParticipantOperations>;
