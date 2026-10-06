"use client";

import { KeyRound, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { AuthCard, FormError } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAuthClient } from "@/lib/admin-auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { formText } from "@/lib/utils";

const BACK_TO_LOGIN = (
  <Link href="/admin/entrar" className="font-semibold text-brand-soft hover:underline">
    Voltar ao login
  </Link>
);

/** Pede o link. A resposta é sempre a mesma: não revela quais e-mails são de admin. */
export function AdminForgotPasswordForm() {
  const emailId = useId();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    const { error: failure } = await adminAuthClient.requestPasswordReset({
      email: formText(new FormData(event.currentTarget), "email"),
      redirectTo: "/admin/redefinir-senha",
    });
    setPending(false);
    if (failure?.status === 429) {
      setError(authErrorMessage(failure));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        icon={MailCheck}
        title="Confira seu e-mail"
        description="Se o e-mail tiver acesso ao painel, enviamos um link para definir uma nova senha. Ele vale por 30 minutos."
        footer={BACK_TO_LOGIN}
      >
        <p className="text-sm text-ink-subtle">
          Não chegou? Veja a caixa de spam ou peça de novo em um minuto.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={KeyRound}
      title="Recuperar senha"
      description="Digite o e-mail da sua conta do painel."
      footer={BACK_TO_LOGIN}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={emailId}>E-mail</Label>
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
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Enviar link
        </Button>
      </form>
    </AuthCard>
  );
}

/** Nova senha a partir do link do e-mail (token de uso único). */
export function AdminResetPasswordForm({ token }: { token: string | undefined }) {
  const router = useRouter();
  const passwordId = useId();
  const confirmId = useId();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <AuthCard
        icon={KeyRound}
        title="Link inválido"
        description="Este link de redefinição expirou ou já foi usado."
        footer={BACK_TO_LOGIN}
      >
        <Button asChild size="lg" className="w-full">
          <Link href="/admin/recuperar-senha">Pedir um novo link</Link>
        </Button>
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token) return;
    const data = new FormData(event.currentTarget);
    const newPassword = formText(data, "password");
    if (newPassword.length < 12) {
      setError("A senha precisa ter ao menos 12 caracteres.");
      return;
    }
    if (newPassword !== formText(data, "confirm")) {
      setError("As senhas não são iguais.");
      return;
    }
    setPending(true);
    setError(undefined);
    const { error: failure } = await adminAuthClient.resetPassword({ newPassword, token });
    if (failure) {
      setPending(false);
      setError(authErrorMessage(failure));
      return;
    }
    router.replace("/admin/entrar?aviso=senha");
  }

  return (
    <AuthCard
      icon={KeyRound}
      title="Definir nova senha"
      description="Use ao menos 12 caracteres. Todas as sessões abertas serão encerradas."
      footer={BACK_TO_LOGIN}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={passwordId}>Nova senha</Label>
          <PasswordInput
            id={passwordId}
            name="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={confirmId}>Repita a senha</Label>
          <PasswordInput id={confirmId} name="confirm" autoComplete="new-password" required />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Salvar nova senha
        </Button>
      </form>
    </AuthCard>
  );
}
