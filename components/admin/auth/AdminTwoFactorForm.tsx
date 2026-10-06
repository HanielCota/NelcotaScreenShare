"use client";

import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthCard, FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAuthClient } from "@/lib/admin-auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { formText } from "@/lib/utils";

export function AdminTwoFactorForm() {
  const router = useRouter();
  const codeId = useId();
  const errorId = useId();
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const code = formText(new FormData(event.currentTarget), "code").replaceAll(" ", "");
    setPending(true);
    setError(undefined);
    const { error: failure } = backup
      ? await adminAuthClient.twoFactor.verifyBackupCode({ code })
      : await adminAuthClient.twoFactor.verifyTotp({ code });
    if (failure) {
      setPending(false);
      setError(authErrorMessage(failure, "Código inválido. Confira e tente de novo."));
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <AuthCard
      icon={backup ? KeyRound : ShieldCheck}
      title="Verificação em duas etapas"
      description={
        backup
          ? "Digite um dos códigos de backup que você guardou. Cada código vale uma vez."
          : "Digite o código de 6 dígitos do seu app autenticador."
      }
      footer={
        <Link href="/admin/entrar" className="font-semibold text-brand-soft hover:underline">
          Voltar ao login
        </Link>
      }
    >
      <form
        key={backup ? "backup" : "totp"}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={codeId}>{backup ? "Código de backup" : "Código"}</Label>
          <Input
            id={codeId}
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={backup ? "text" : "numeric"}
            pattern={backup ? undefined : "[0-9]{6}"}
            maxLength={backup ? 32 : 6}
            className="h-12 text-center text-lg font-semibold tracking-[0.3em]"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <FormError id={errorId} message={error} />
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Verificar
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setBackup((value) => !value);
            setError(undefined);
          }}
        >
          {backup ? "Usar o código do app" : "Perdi o acesso ao app: usar código de backup"}
        </Button>
      </form>
    </AuthCard>
  );
}
