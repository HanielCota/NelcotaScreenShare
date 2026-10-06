"use client";

import { Copy, Link2, Plus, XCircle } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { createInviteAction, revokeInviteAction } from "../actions";

export interface InviteRow {
  id: string;
  label: string | null;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: string;
  /** Calculado no banco (relógio do servidor). */
  state: keyof typeof STATES;
}

const VALIDITY_OPTIONS = [
  { value: "", label: "Sem validade" },
  { value: "1", label: "1 hora" },
  { value: "24", label: "1 dia" },
  { value: "168", label: "7 dias" },
  { value: "720", label: "30 dias" },
];

const STATES = {
  active: { label: "Ativo", tone: "success" },
  revoked: { label: "Revogado", tone: "neutral" },
  expired: { label: "Expirado", tone: "neutral" },
  exhausted: { label: "Esgotado", tone: "warning" },
} as const;

function CreateInviteDialog({
  roomId,
  open,
  onOpenChange,
}: {
  roomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ids = { label: useId(), uses: useId(), validity: useId(), link: useId() };
  const [link, setLink] = useState<string | null>(null);
  const create = useAction(createInviteAction, {
    onSuccess: ({ data }) => setLink(data.link),
    onError: ({ error }) => toast.error(error.serverError ?? "Confira os campos e tente de novo."),
  });
  const close = (next: boolean) => {
    if (!next) setLink(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        {link ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Convite criado</DialogTitle>
              <DialogDescription>
                Copie o link agora: por segurança, ele não aparece de novo. Quem entra por ele não
                precisa da senha de acesso.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Label htmlFor={ids.link} className="sr-only">
                Link do convite
              </Label>
              <Input
                id={ids.link}
                readOnly
                value={link}
                onFocus={(event) => event.target.select()}
              />
              <Button
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => toast.success("Link copiado."))
                    .catch(() => toast.error("Não deu para copiar. Selecione e copie o link."))
                }
              >
                <Copy aria-hidden="true" />
                Copiar
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => close(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const uses = String(data.get("uses") ?? "").trim();
              const validity = String(data.get("validity") ?? "");
              create.execute({
                roomId,
                label: String(data.get("label") ?? ""),
                maxUses: uses ? Number(uses) : null,
                validityHours: validity ? Number(validity) : null,
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Novo convite</DialogTitle>
              <DialogDescription>
                Defina validade e/ou limite de pessoas. Voltar à sala com o mesmo convite não gasta
                outro uso.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.label}>Nome (opcional)</Label>
              <Input id={ids.label} name="label" maxLength={80} placeholder="Ex.: Turma de março" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.uses}>Limite de pessoas</Label>
                <Input
                  id={ids.uses}
                  name="uses"
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="Sem limite"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.validity}>Validade</Label>
                <select
                  id={ids.validity}
                  name="validity"
                  defaultValue="24"
                  className="h-9 rounded-lg border border-input bg-surface-2 px-2.5 text-sm text-ink"
                >
                  {VALIDITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                <Link2 aria-hidden="true" />
                Criar convite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Convites da sala: criar (link mostrado uma vez) e revogar. */
export function InvitesPanel({
  roomId,
  invites,
  can,
}: {
  roomId: string;
  invites: InviteRow[];
  can: { create: boolean; revoke: boolean };
}) {
  const [open, setOpen] = useState(false);
  const revoke = useAction(revokeInviteAction, {
    onSuccess: () => toast.success("Convite revogado."),
    onError: ({ error }) => toast.error(error.serverError ?? "Não foi possível revogar."),
  });
  return (
    <div className="flex flex-col gap-3">
      {can.create ? (
        <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" />
          Novo convite
        </Button>
      ) : null}
      {invites.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum convite para esta sala.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {invites.map((invite) => {
            const state = STATES[invite.state];
            return (
              <li key={invite.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 font-medium">
                    {invite.label ?? "Convite sem nome"}
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  </span>
                  <span className="text-ink-muted">
                    {invite.uses}
                    {invite.maxUses === null ? "" : ` de ${invite.maxUses}`}{" "}
                    {invite.uses === 1 ? "pessoa" : "pessoas"} ·{" "}
                    {invite.expiresAt
                      ? `expira ${formatDateTime(invite.expiresAt)}`
                      : "sem validade"}{" "}
                    · por {invite.createdBy}
                  </span>
                </span>
                {can.revoke && invite.state === "active" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => revoke.execute({ id: invite.id })}
                  >
                    <XCircle aria-hidden="true" />
                    Revogar
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {can.create ? (
        <CreateInviteDialog roomId={roomId} open={open} onOpenChange={setOpen} />
      ) : null}
    </div>
  );
}
