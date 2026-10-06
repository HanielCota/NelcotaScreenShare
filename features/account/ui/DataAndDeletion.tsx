"use client";

import { Download, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { deleteMyAccount } from "@/features/account/actions";
import { FormError } from "@/features/auth/ui/AuthCard";
import { PasswordInput } from "@/features/auth/ui/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { formText } from "@/lib/utils";

/** Baixar os dados e excluir a conta (LGPD). */
export function DataAndDeletion() {
  const router = useRouter();
  const passwordId = useId();
  const [confirming, setConfirming] = useState(false);
  const remove = useAction(deleteMyAccount, {
    onSuccess: () => {
      void authClient.signOut().finally(() => {
        router.replace("/?aviso=conta-excluida");
        router.refresh();
      });
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink-muted">
          Um arquivo JSON com tudo o que guardamos ligado à sua conta.
        </p>
        <Button asChild variant="outline" className="self-start">
          <a href="/api/conta/dados" download>
            <Download aria-hidden="true" />
            Baixar meus dados
          </a>
        </Button>
      </div>
      <div className="flex flex-col gap-3 border-t border-danger/30 pt-5">
        <p className="flex items-start gap-2 text-sm text-ink-muted">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          Excluir apaga seu e-mail, nome, senha e sessões na hora e não pode ser desfeito. Registros
          de acesso exigidos por lei ficam guardados, sem seus dados de contato, até o fim do prazo
          legal.
        </p>
        {confirming ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              remove.execute({ password: formText(new FormData(event.currentTarget), "password") });
            }}
            className="flex flex-col gap-3 sm:max-w-sm"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor={passwordId}>Digite sua senha para confirmar</Label>
              <PasswordInput
                id={passwordId}
                name="password"
                autoComplete="current-password"
                required
              />
            </div>
            <FormError message={remove.result.serverError} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={remove.isPending}>
                {remove.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Excluir minha conta
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="destructive" className="self-start" onClick={() => setConfirming(true)}>
            Excluir minha conta
          </Button>
        )}
      </div>
    </div>
  );
}
