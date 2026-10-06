"use client";

import { Ban, LockOpen, LogOut, MailCheck, RotateCcw, ShieldX, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toastWithUndo } from "@/components/undo-toast";
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
import type { ParticipantStatus } from "@/features/admin/participants/search-params";
import { availableActions } from "@/features/admin/participants/available-actions";

type Dialog = "block" | "delete" | "anonymize" | null;

/** Erro do servidor no toast (a mensagem já vem pronta para quem usa). */
function fail(fallback: string) {
  return {
    onError: ({ error }: { error: { serverError?: string } }) =>
      toast.error(error.serverError ?? fallback),
  };
}

/** Ações do detalhe de um participante, conforme o status e as permissões. */
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
  const selection = { tipo: "ids" as const, ids: [id] };
  const block = useAction(blockParticipantsAction, {
    onSuccess: () => {
      setDialog(null);
      toast.success("Conta bloqueada. Sessões encerradas.");
    },
    ...fail("Não foi possível bloquear."),
  });
  const unblock = useAction(unblockParticipantsAction, {
    onSuccess: () => toast.success("Conta desbloqueada."),
    ...fail("Não foi possível desbloquear."),
  });
  const revoke = useAction(revokeParticipantSessionsAction, {
    onSuccess: ({ data }) => toast.success(`${data.count} sessão(ões) encerrada(s).`),
    ...fail("Não foi possível encerrar as sessões."),
  });
  const resend = useAction(resendVerificationAction, {
    onSuccess: () => toast.success("Link de confirmação reenviado."),
    ...fail("Não foi possível reenviar."),
  });
  const restore = useAction(restoreParticipantsAction, {
    onSuccess: () => toast.success("Conta restaurada."),
    ...fail("Não foi possível restaurar."),
  });
  const remove = useAction(deleteParticipantsAction, {
    onSuccess: ({ data }) => {
      setDialog(null);
      toastWithUndo(
        "Usuário excluído",
        () => restoreParticipantsAction({ ids: data.ids }),
        "Conta restaurada.",
      );
    },
    ...fail("Não foi possível excluir."),
  });
  const anonymize = useAction(anonymizeParticipantAction, {
    onSuccess: () => {
      setDialog(null);
      toast.success("Conta anonimizada.");
    },
    ...fail("Não foi possível anonimizar."),
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
        description="As sessões são encerradas e a pessoa não consegue entrar nem participar de salas até ser desbloqueada."
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
