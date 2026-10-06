"use client";

import { Loader2, UserPlus } from "lucide-react";
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
import { displayNameSchema } from "@/lib/livekit";
import { formText } from "@/lib/utils";

const MIN_PASSWORD = 10;

export function SignUpForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const ids = {
    name: useId(),
    email: useId(),
    password: useId(),
    confirm: useId(),
    terms: useId(),
  };
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const back = encodeURIComponent(returnTo);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const name = displayNameSchema.safeParse(formText(data, "name"));
    const email = formText(data, "email").trim();
    const password = formText(data, "password");
    if (!name.success) return setError(name.error.issues[0]?.message ?? "Confira seu nome.");
    if (!email.includes("@")) return setError("Digite um e-mail válido.");
    if (password.length < MIN_PASSWORD) {
      return setError(`A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`);
    }
    if (password !== formText(data, "confirm")) return setError("As senhas não são iguais.");
    if (data.get("terms") !== "on")
      return setError("Para criar a conta, aceite o aviso de privacidade.");

    setPending(true);
    setError(undefined);
    const { error: failure } = await authClient.signUp.email({
      name: name.data,
      email,
      password,
      callbackURL: returnTo,
    });
    // E-mail já cadastrado responde igual (o dono do e-mail é avisado por e-mail).
    if (failure && failure.status !== 422 && failure.code !== "USER_ALREADY_EXISTS") {
      setPending(false);
      setError(authErrorMessage(failure));
      return;
    }
    router.replace(`/verificar-email?email=${encodeURIComponent(email)}&voltar=${back}`);
  }

  return (
    <AuthCard
      icon={UserPlus}
      title="Criar conta"
      description="Com a conta você cria salas, entra nas salas do time e compartilha a tela."
      footer={
        <span>
          Já tem conta?{" "}
          <Link
            href={`/entrar?voltar=${back}`}
            className="font-semibold text-brand-soft hover:underline"
          >
            Entrar
          </Link>
        </span>
      }
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.name}>Seu nome</Label>
          <Input
            id={ids.name}
            name="name"
            autoComplete="nickname"
            placeholder="Como vão te ver na sala"
            required
            maxLength={32}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.email}>E-mail</Label>
          <Input
            id={ids.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.password}>Senha (mínimo de {MIN_PASSWORD} caracteres)</Label>
          <PasswordInput
            id={ids.password}
            name="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            maxLength={128}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={ids.confirm}>Repita a senha</Label>
          <PasswordInput id={ids.confirm} name="confirm" autoComplete="new-password" required />
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <input
            id={ids.terms}
            name="terms"
            type="checkbox"
            required
            className="mt-0.5 size-4 shrink-0 accent-brand"
          />
          <label htmlFor={ids.terms} className="text-ink-muted">
            Li o{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="font-semibold text-brand-soft hover:underline"
            >
              aviso de privacidade
            </Link>{" "}
            e concordo com o uso dos meus dados para usar o Nelcota.
          </label>
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Criar conta
        </Button>
      </form>
    </AuthCard>
  );
}
