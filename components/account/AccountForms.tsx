"use client";

import { Download, Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { deleteMyAccount } from "@/app/conta/actions";
import { FormError } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { displayNameSchema } from "@/lib/livekit";
import { PASSWORD_LIMITS } from "@/lib/password-rules";
import { formText } from "@/lib/utils";

export function Section({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={
        tone === "danger"
          ? "flex flex-col gap-4 rounded-2xl border border-danger/40 bg-danger/5 p-6 sm:p-8"
          : "glass flex flex-col gap-4 rounded-2xl p-6 sm:p-8"
      }
    >
      <div>
        <h2 id={id} className="text-lg font-bold tracking-tight">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

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
