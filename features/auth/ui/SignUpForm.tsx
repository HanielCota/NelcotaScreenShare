"use client";

import { Check, Circle, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { AccessTabs } from "./AccessTabs";
import { EmailField, forgetTypedEmail } from "./EmailField";
import { AuthCard } from "./AuthCard";
import { FormError } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { celebrateMascot, upsetMascot } from "@/features/mascot/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccessContext } from "@/features/auth/domain/access-context";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import { displayNameSchema } from "@/features/room/domain/participant-label";
import {
  PASSWORD_LIMITS,
  passwordStrength,
  STRENGTH_LABELS,
} from "@/features/auth/domain/password-rules";
import { cn, formText } from "@/lib/utils";

const { min: MIN_PASSWORD, max: MAX_PASSWORD } = PASSWORD_LIMITS.user;

const STRENGTH_COLORS = ["bg-line", "bg-danger", "bg-warning", "bg-success"] as const;

/** Requisito e força da senha, ao vivo (a força só orienta; o servidor exige o tamanho). */
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
  /** Com a confirmação desligada, o cadastro já entra na conta. */
  verificationRequired: boolean;
}) {
  const router = useRouter();
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
    const name = displayNameSchema.safeParse(formText(data, "name"));
    const email = formText(data, "email").trim();
    if (!name.success) {
      return fail(name.error.issues[0]?.message ?? "Confira seu nome.", nameRef.current);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return fail("Digite um e-mail válido.", form.querySelector<HTMLElement>("[name=email]"));
    }
    if (password.length < MIN_PASSWORD) {
      return fail(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`, passwordRef.current);
    }

    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.signUp.email({
      name: name.data,
      email,
      password,
      callbackURL: returnTo,
    });
    // Com confirmação, e-mail já cadastrado responde igual (o dono é avisado por e-mail).
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
      router.replace(`/verificar-email?email=${encodeURIComponent(email)}&voltar=${back}`);
      return;
    }
    // Sem confirmação, o Better Auth já abriu a sessão: segue para onde a pessoa ia.
    router.replace(returnTo);
    router.refresh();
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
        onSubmit={(event) => void handleSubmit(event)}
        onChange={(event) => {
          // Nome e e-mail entram na conta da força: senha com eles fica "Fraca".
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
            href="/privacidade"
            target="_blank"
            className="font-semibold text-brand-soft hover:underline"
          >
            aviso de privacidade
          </Link>
          .
        </p>
      </form>
    </AuthCard>
  );
}
