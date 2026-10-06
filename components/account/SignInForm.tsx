"use client";

import { Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { AccessTabs } from "@/components/account/AccessTop";
import { EmailField, forgetTypedEmail } from "@/components/account/EmailField";
import { AuthCard, FormError } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { celebrateMascot, nodMascot, upsetMascot } from "@/components/mascot/events";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AccessContext } from "@/lib/access-context";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { formText } from "@/lib/utils";

/** Erros que a pessoa causou (credenciais) deixam o mascote bravo; o resto, preocupado. */
const OWN_FAULT = new Set(["INVALID_EMAIL_OR_PASSWORD", "FAILED_TO_CREATE_SESSION"]);

export function SignInForm({
  returnTo,
  context,
  notice,
}: {
  returnTo: string;
  context: AccessContext;
  notice?: string | undefined;
}) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const email = formText(data, "email").trim();
    const password = formText(data, "password");
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      upsetMascot("grumpy", (email ? passwordRef.current : null) ?? undefined);
      return;
    }
    setPending(true);
    setError(undefined);
    const { data: result, error: failure } = await authClient.signIn.email({
      email,
      password,
      callbackURL: returnTo,
    });
    if (failure) {
      setPending(false);
      setError(authErrorMessage(failure));
      if (failure.code && OWN_FAULT.has(failure.code)) {
        upsetMascot("grumpy", passwordRef.current ?? undefined);
        passwordRef.current?.select();
      } else {
        upsetMascot("worried");
      }
      return;
    }
    forgetTypedEmail();
    // Com 2FA, o Better Auth leva para /entrar/2fa (onTwoFactorRedirect do cliente).
    if (result && "twoFactorRedirect" in result && result.twoFactorRedirect) {
      nodMascot();
      return;
    }
    celebrateMascot();
    router.replace(returnTo);
    router.refresh();
  }

  return (
    <AuthCard
      icon={LogIn}
      title="Entre na sua conta"
      description={
        context.kind === "room"
          ? "Depois de entrar, você volta direto para a sala."
          : "Para criar salas e compartilhar a tela."
      }
      top={<AccessTabs current="entrar" returnTo={returnTo} />}
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
        <EmailField
          id={emailId}
          autoComplete="username"
          invalid={error !== undefined}
          describedBy={error ? errorId : undefined}
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={passwordId}>Senha</Label>
            <Link
              href="/recuperar-senha"
              className="text-sm font-semibold text-brand-soft hover:underline"
            >
              Esqueci a senha
            </Link>
          </div>
          <PasswordInput
            ref={passwordRef}
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
