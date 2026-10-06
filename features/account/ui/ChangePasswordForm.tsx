"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormError } from "@/features/auth/ui/AuthCard";
import { PasswordInput } from "@/features/auth/ui/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import { PASSWORD_LIMITS } from "@/features/auth/domain/password-rules";
import { formText } from "@/lib/utils";

export function ChangePasswordForm() {
  const router = useRouter();
  const ids = { current: useId(), next: useId(), confirm: useId() };
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = formText(data, "next");
    if (newPassword.length < PASSWORD_LIMITS.user.min)
      return setError(`A nova senha precisa ter ao menos ${PASSWORD_LIMITS.user.min} caracteres.`);
    if (newPassword !== formText(data, "confirm")) return setError("As senhas não são iguais.");
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.changePassword({
      currentPassword: formText(data, "current"),
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (failure) return setError(authErrorMessage(failure, "Senha atual incorreta."));
    form.reset();
    toast.success("Senha alterada. As outras sessões foram encerradas.");
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="grid gap-3 sm:max-w-sm"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.current}>Senha atual</Label>
        <PasswordInput id={ids.current} name="current" autoComplete="current-password" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.next}>
          Nova senha (mínimo de {PASSWORD_LIMITS.user.min} caracteres)
        </Label>
        <PasswordInput
          id={ids.next}
          name="next"
          autoComplete="new-password"
          required
          minLength={PASSWORD_LIMITS.user.min}
          maxLength={PASSWORD_LIMITS.user.max}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.confirm}>Repita a nova senha</Label>
        <PasswordInput id={ids.confirm} name="confirm" autoComplete="new-password" required />
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Trocar senha
      </Button>
    </form>
  );
}
