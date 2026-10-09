import { Ban, LockOpen, LogOut, MailCheck, RotateCcw, ShieldX, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import type { ParticipantStatus } from "@/features/admin/participants/domain/search-params";
import { availableActions } from "@/features/admin/participants/domain/available-actions";
import { BLOCK_DESCRIPTION } from "@/features/admin/participants/domain/labels";
import { useParticipantOperations, type ParticipantOperations } from "./use-participant-operations";

type Dialog = "block" | "delete" | "anonymize" | null;

interface ParticipantSelection {
  kind: "ids";
  ids: string[];
}

function ActionButtons({
  id,
  selection,
  show,
  operations,
  openDialog,
}: {
  id: string;
  selection: ParticipantSelection;
  show: ReturnType<typeof availableActions>;
  operations: ParticipantOperations;
  openDialog: (dialog: Dialog) => void;
}) {
  const { unblock, revoke, resend, restore } = operations;
  return (
    <>
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
        <Button variant="outline" onClick={() => openDialog("block")}>
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
        <Button variant="destructive" onClick={() => openDialog("delete")}>
          <Trash2 aria-hidden="true" />
          Excluir
        </Button>
      ) : null}
      {show.anonymize ? (
        <Button variant="destructive" onClick={() => openDialog("anonymize")}>
          <ShieldX aria-hidden="true" />
          Anonimizar (LGPD)
        </Button>
      ) : null}
    </>
  );
}

function ConfirmDialogs({
  id,
  selection,
  dialog,
  setDialog,
  operations,
}: {
  id: string;
  selection: ParticipantSelection;
  dialog: Dialog;
  setDialog: (dialog: Dialog) => void;
  operations: ParticipantOperations;
}) {
  const { block, remove, anonymize } = operations;
  return (
    <>
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
    </>
  );
}

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
  const selection: ParticipantSelection = { kind: "ids", ids: [id] };
  const operations = useParticipantOperations(() => setDialog(null));

  const show = availableActions({ status, verified, anonymized, sessions, can });
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButtons
        id={id}
        selection={selection}
        show={show}
        operations={operations}
        openDialog={setDialog}
      />
      <ConfirmDialogs
        id={id}
        selection={selection}
        dialog={dialog}
        setDialog={setDialog}
        operations={operations}
      />
    </div>
  );
}
