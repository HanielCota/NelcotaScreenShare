import { Check, Circle, Loader2, UserPlus } from "lucide-react";
import { Link, useNavigate, useRevalidator } from "react-router";

import { useId, useRef, useState, type FormEvent } from "react";
import { AccessTabs } from "./AccessTabs";
import { EmailField, forgetTypedEmail } from "./EmailField";
import { AuthCard } from "./AuthCard";
import { FormError } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { celebrateMascot, upsetMascot } from "@/features/mascot/client/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccessContext } from "@/features/auth/domain/access-context";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import {
  PASSWORD_LIMITS,
  passwordStrength,
  STRENGTH_LABELS,
} from "@/features/auth/domain/password-rules";
import { cn, formText } from "@/lib/utils";
import { checkSignUp } from "@/features/auth/domain/sign-up";

const { min: MIN_PASSWORD, max: MAX_PASSWORD } = PASSWORD_LIMITS.user;

const STRENGTH_COLORS = ["bg-line", "bg-danger", "bg-warning", "bg-success"] as const;

/** Password requirement and strength, live (strength only guides; the server requires the length). */
function PasswordGuide({
  id,
  password,
  personal,
}: {
  id: string;
  password: string;
  personal: string[];
}) {
  const longEnough = password.length >= MIN_PASSWORD;
  const strength = passwordStrength(password, { min: MIN_PASSWORD, personal });
  return (
    <div id={id} className="flex flex-col gap-2 text-sm">
      <p className={cn("flex items-center gap-2", longEnough ? "text-success" : "text-ink-muted")}>
        {longEnough ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Circle className="size-4" aria-hidden="true" />
        )}
        Pelo menos {MIN_PASSWORD} caracteres
        <span className="sr-only">{longEnough ? "(ok)" : "(ainda não)"}</span>
      </p>
      {password ? (
        <div className="flex items-center gap-3">
          <span className="grid flex-1 grid-cols-3 gap-1" aria-hidden="true">
            {[1, 2, 3].map((level) => (
              <span
                key={level}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  strength >= level ? STRENGTH_COLORS[strength] : "bg-line",
                )}
              />
            ))}
          </span>
          <span className="w-20 text-right text-xs text-ink-muted" aria-live="polite">
            {STRENGTH_LABELS[strength]}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function SignUpForm({
  returnTo,
  context,
  verificationRequired,
}: {
  returnTo: string;
  context: AccessContext;
  /** With confirmation off, sign-up signs into the account right away. */
  verificationRequired: boolean;
}) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const ids = { name: useId(), email: useId(), password: useId(), guide: useId(), error: useId() };
  const nameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const [personal, setPersonal] = useState<string[]>([]);
  const back = encodeURIComponent(returnTo);

  function fail(message: string, field?: HTMLElement | null) {
    setError(message);
    upsetMascot("grumpy", field ?? undefined);
    field?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const check = checkSignUp({
      name: formText(data, "name"),
      email: formText(data, "email"),
      password,
      minPassword: MIN_PASSWORD,
    });
    if (!check.ok) {
      const fields = {
        name: nameRef.current,
        email: form.querySelector<HTMLElement>("[name=email]"),
        password: passwordRef.current,
      };
      return fail(check.message, fields[check.field]);
    }
    const { name, email } = check;

    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: returnTo,
    });
    // With confirmation, an already registered e-mail responds the same (the owner is notified by e-mail).
    const genericDuplicate =
      verificationRequired && (failure?.status === 422 || failure?.code === "USER_ALREADY_EXISTS");
    if (failure && !genericDuplicate) {
      setPending(false);
      setError(authErrorMessage(failure));
      upsetMascot(failure.status && failure.status < 500 ? "grumpy" : "worried");
      return;
    }
    forgetTypedEmail();
    celebrateMascot();
    if (verificationRequired) {
      void navigate(`/verificar-email?email=${encodeURIComponent(email)}&voltar=${back}`, {
        replace: true,
      });
      return;
    }
    // Without confirmation, Better Auth already opened the session: go where the person was heading.
    void navigate(returnTo, { replace: true });
    void revalidator.revalidate();
  }

  return (
    <AuthCard
      icon={UserPlus}
      title="Crie sua conta"
      description={
        context.kind === "room"
          ? verificationRequired
            ? "Depois de confirmar o e-mail, você entra direto na sala."
            : "Assim que criar a conta, você entra direto na sala."
          : "Para criar salas, entrar nas salas do time e compartilhar a tela."
      }
      top={<AccessTabs current="cadastro" returnTo={returnTo} />}
    >
      <form
        method="post"
        onSubmit={(event) => void handleSubmit(event)}
        onChange={(event) => {
          // Name and e-mail count in the strength score: a password containing them is "Fraca".
          const form = event.currentTarget;
          const value = (field: string) =>
            form.querySelector<HTMLInputElement>(`[name=${field}]`)?.value ?? "";
          setPersonal([value("name"), value("email").split("@")[0] ?? ""]);
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.name}>Seu nome</Label>
          <Input
            ref={nameRef}
            id={ids.name}
            name="name"
            autoComplete="nickname"
            placeholder="Como vão te ver na sala"
            required
            maxLength={32}
            className="h-11"
          />
        </div>
        <EmailField id={ids.email} autoComplete="email" />
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.password}>Senha</Label>
          <PasswordInput
            ref={passwordRef}
            id={ids.password}
            name="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            maxLength={MAX_PASSWORD}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby={ids.guide}
          />
          <PasswordGuide id={ids.guide} password={password} personal={personal} />
        </div>
        <FormError id={ids.error} message={error} />
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Criar conta
        </Button>
        <p className="text-center text-xs text-ink-subtle">
          Ao criar a conta, você concorda com o{" "}
          <Link
            to="/privacidade"
            target="_blank"
            className="font-medium text-brand-soft hover:underline"
          >
            aviso de privacidade
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}
