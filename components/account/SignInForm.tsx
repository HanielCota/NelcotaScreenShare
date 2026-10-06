"use client";

import { Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthCard, FormError } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { formText } from "@/lib/utils";

export function SignInForm({
  returnTo,
  notice,
}: {
  returnTo: string;
  notice?: string | undefined;
}) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const back = encodeURIComponent(returnTo);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    const { data: result, error: failure } = await authClient.signIn.email({
      email: formText(data, "email"),
      password: formText(data, "password"),
      callbackURL: returnTo,
    });
    if (failure) {
      setPending(false);
      setError(authErrorMessage(failure));
      return;
    }
    if (result && "twoFactorRedirect" in result && result.twoFactorRedirect) return;
    router.replace(returnTo);
    router.refresh();
  }

  return (
    <AuthCard
      icon={LogIn}
      title="Entrar"
      description="Entre para criar salas e compartilhar a tela."
      footer={
        <span className="flex flex-col gap-2">
          <span>
            Ainda não tem conta?{" "}
            <Link
              href={`/cadastro?voltar=${back}`}
              className="font-semibold text-brand-soft hover:underline"
            >
              Criar conta
            </Link>
          </span>
          <Link href="/recuperar-senha" className="font-semibold text-brand-soft hover:underline">
            Esqueci minha senha
          </Link>
        </span>
      }
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        {notice ? (
          <output className="block rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink-muted">
            {notice}
          </output>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor={emailId}>E-mail</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="username"
            required
            className="h-11"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={passwordId}>Senha</Label>
          <PasswordInput
            id={passwordId}
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <FormError id={errorId} message={error} />
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
