"use client";

import { useId, useState, type FormEvent } from "react";
import { FormError } from "@/components/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import { formText } from "@/lib/utils";

/** Troca de e-mail: o link vai para o endereço novo; até confirmar, vale o antigo. */
export function ChangeEmailForm({ email }: { email: string }) {
  const emailId = useId();
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newEmail = formText(new FormData(event.currentTarget), "email").trim();
    if (!newEmail.includes("@") || newEmail.toLowerCase() === email.toLowerCase()) {
      return setError("Digite um e-mail diferente do atual.");
    }
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.changeEmail({
      newEmail,
      callbackURL: "/conta?aviso=email",
    });
    setPending(false);
    // E-mail já usado por outra conta também volta 200 (o servidor não revela);
    // qualquer erro aqui é real (sessão expirada, limite, falha do servidor).
    if (failure) return setError(authErrorMessage(failure));
    setSentTo(newEmail);
  }

  if (sentTo) {
    return (
      <p className="text-sm text-ink-muted">
        Se for possível usar <strong className="text-ink">{sentTo}</strong>, enviamos um link para
        confirmar a troca. Até lá, sua conta continua com {email}.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="flex flex-col gap-3 sm:max-w-sm"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={emailId}>Novo e-mail</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11"
        />
      </div>
      <FormError message={error} />
      <Button type="submit" variant="outline" disabled={pending} className="self-start">
        Trocar e-mail
      </Button>
    </form>
  );
}
