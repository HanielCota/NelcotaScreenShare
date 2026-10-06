"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormError } from "@/features/auth/ui/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import { displayNameSchema } from "@/lib/livekit";
import { formText } from "@/lib/utils";

/** Nome mostrado na sala. */
export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const nameId = useId();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = displayNameSchema.safeParse(formText(new FormData(event.currentTarget), "name"));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Confira seu nome.");
    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.updateUser({ name: parsed.data });
    setPending(false);
    if (failure) return setError(authErrorMessage(failure));
    toast.success("Nome atualizado. Ele vale a partir da próxima sala em que você entrar.");
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="flex flex-col gap-3 sm:max-w-sm"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Nome na sala</Label>
        <Input
          id={nameId}
          name="name"
          defaultValue={name}
          maxLength={32}
          required
          className="h-11"
        />
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Salvar nome
      </Button>
    </form>
  );
}
