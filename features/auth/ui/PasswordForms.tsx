import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { useId, useState, type FormEvent } from "react";
import { AuthCard } from "./AuthCard";
import { FormError } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAuthClient } from "@/features/auth/client/admin-auth-client";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import { PASSWORD_LIMITS } from "@/features/auth/domain/password-rules";
import { formText } from "@/lib/utils";

type Scope = "admin" | "user";

const PATHS: Record<Scope, { login: string; forgot: string; reset: string; minLength: number }> = {
  admin: {
    login: "/admin/entrar",
    forgot: "/admin/recuperar-senha",
    reset: "/admin/redefinir-senha",
    minLength: PASSWORD_LIMITS.admin.min,
  },
  user: {
    login: "/entrar",
    forgot: "/recuperar-senha",
    reset: "/redefinir-senha",
    minLength: PASSWORD_LIMITS.user.min,
  },
};

function BackToLogin({ scope }: { scope: Scope }) {
  return (
    <Link to={PATHS[scope].login} className="font-medium text-brand-soft hover:underline">
      Voltar para entrar
    </Link>
  );
}

function OtherAccountRecovery({ scope }: { scope: Scope }) {
  const otherScope = scope === "admin" ? "user" : "admin";
  return (
    <p className="text-sm text-ink-subtle">
      {scope === "admin"
        ? "Contas de participante e do painel são separadas. "
        : "Sua conta é do painel administrativo? "}
      <Link to={PATHS[otherScope].forgot} className="font-medium text-brand-soft hover:underline">
        {scope === "admin" ? "Recuperar conta de participante" : "Recuperar conta do painel"}
      </Link>
    </p>
  );
}

/** Requests the link. The response is always the same: it does not reveal which e-mails have an account. */
export function ForgotPasswordForm({ scope }: { scope: Scope }) {
  const client = scope === "admin" ? adminAuthClient : authClient;
  const emailId = useId();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    const { error: failure } = await client.requestPasswordReset({
      email: formText(new FormData(event.currentTarget), "email"),
      redirectTo: PATHS[scope].reset,
    });
    setPending(false);
    if (failure) {
      setError(authErrorMessage(failure, "Não foi possível enviar o link. Tente de novo."));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        icon={MailCheck}
        title="Confira seu e-mail"
        description={
          scope === "admin"
            ? "Se o e-mail tiver uma conta do painel, o link para definir uma nova senha será enviado. Ele vale por 30 minutos."
            : "Se o e-mail tiver uma conta de participante, o link para definir uma nova senha será enviado. Ele vale por 30 minutos."
        }
        footer={<BackToLogin scope={scope} />}
      >
        <p className="text-sm text-ink-subtle">
          Não chegou? Veja a caixa de spam ou peça de novo em um minuto.
        </p>
        <OtherAccountRecovery scope={scope} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={KeyRound}
      title="Recuperar senha"
      description={
        scope === "admin"
          ? "Digite o e-mail da sua conta do painel."
          : "Digite o e-mail da sua conta."
      }
      footer={<BackToLogin scope={scope} />}
    >
      <form
        method="post"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <OtherAccountRecovery scope={scope} />
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

/** New password from the e-mail link (single-use token). */
export function ResetPasswordForm({ scope, token }: { scope: Scope; token: string | undefined }) {
  const client = scope === "admin" ? adminAuthClient : authClient;
  const { minLength } = PATHS[scope];
  const navigate = useNavigate();
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
        footer={<BackToLogin scope={scope} />}
      >
        <Button asChild size="lg" className="w-full">
          <Link to={PATHS[scope].forgot}>Pedir um novo link</Link>
        </Button>
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token) return;
    const data = new FormData(event.currentTarget);
    const newPassword = formText(data, "password");
    if (newPassword.length < minLength) {
      setError(`A senha precisa ter ao menos ${minLength} caracteres.`);
      return;
    }
    if (newPassword !== formText(data, "confirm")) {
      setError("As senhas não são iguais.");
      return;
    }
    setPending(true);
    setError(undefined);
    const { error: failure } = await client.resetPassword({ newPassword, token });
    if (failure) {
      setPending(false);
      setError(authErrorMessage(failure));
      return;
    }
    void navigate(`${PATHS[scope].login}?aviso=senha`, { replace: true });
  }

  return (
    <AuthCard
      icon={KeyRound}
      title="Definir nova senha"
      description={`Use ao menos ${minLength} caracteres. Todas as sessões abertas serão encerradas.`}
      footer={<BackToLogin scope={scope} />}
    >
      <form
        method="post"
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
            minLength={minLength}
            maxLength={PASSWORD_LIMITS[scope].max}
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
