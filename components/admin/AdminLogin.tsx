"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useActionState, useId } from "react";
import type { ActionState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLogin({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const passwordId = useId();

  return (
    <form action={formAction} className="glass w-full max-w-sm rounded-2xl p-8">
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2">
        <LockKeyhole className="size-5 text-brand-soft" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Painel admin</h1>
      <p className="mt-1 text-sm text-ink-muted">Entre com a senha do administrador.</p>

      <div className="mt-6 flex flex-col gap-2">
        <Label htmlFor={passwordId}>Senha</Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.message ? true : undefined}
          aria-describedby={state.message ? `${passwordId}-error` : undefined}
          className="h-11"
        />
        {state.message ? (
          <p id={`${passwordId}-error`} role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-6 w-full">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Entrar
      </Button>
    </form>
  );
}
