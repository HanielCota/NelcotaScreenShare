import { Loader2 } from "lucide-react";
import { useNavigate, useRevalidator } from "react-router";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/FormError";
import { PasswordInput } from "@/components/PasswordInput";
import { QrCode } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminAuthClient } from "@/features/auth/client/admin-auth-client";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import { BackupCodes } from "./BackupCodes";
import { TwoFactorHeader } from "./TwoFactorHeader";
import { formText } from "@/lib/utils";

type Step =
  | { name: "idle" }
  | { name: "scan"; totpURI: string; secret: string; backupCodes: string[] }
  | { name: "codes"; backupCodes: string[] };

export function TwoFactorSettings({
  scope,
  enabled,
  required,
  doneHref,
  variant = "card",
}: {
  /** Which Better Auth instance: admin panel or participant account. */
  scope: "admin" | "user";
  enabled: boolean;
  /** The role requires 2FA (owner/admin): it cannot be turned off. */
  required: boolean;
  /** Where to go after enabling. */
  doneHref: string;
  /** `plain`: no card or header; the caller already shows title and state. */
  variant?: "card" | "plain";
}) {
  const plain = variant === "plain";
  const client = scope === "admin" ? adminAuthClient : authClient;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const passwordId = useId();
  const codeId = useId();
  const errorId = useId();
  const [step, setStep] = useState<Step>({ name: "idle" });
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [invalidField, setInvalidField] = useState<string>();

  function requiredPassword(form: HTMLFormElement): string | null {
    const password = formText(new FormData(form), "password");
    if (password) return password;
    setError("Informe sua senha para continuar.");
    const input = form.querySelector<HTMLInputElement>('input[name="password"]');
    setInvalidField(input?.id);
    input?.focus();
    return null;
  }

  async function run<T>(fn: () => Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
    setPending(true);
    setError(undefined);
    setInvalidField(undefined);
    const { data, error: failure } = await fn();
    setPending(false);
    if (failure) {
      setError(authErrorMessage(failure));
      return null;
    }
    return data;
  }

  async function handleEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = requiredPassword(event.currentTarget);
    if (password === null) return;
    const data = await run(() => client.twoFactor.enable({ password }));
    // Only TOTP (authenticator app) is set up; "otp" would be a code by e-mail.
    if (data?.method !== "totp") return;
    const secret = new URL(data.totpURI).searchParams.get("secret");
    if (!secret) {
      setError("Não foi possível gerar a chave do app autenticador. Tente de novo.");
      return;
    }
    setStep({ name: "scan", totpURI: data.totpURI, secret, backupCodes: data.backupCodes });
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.name !== "scan") return;
    const code = formText(new FormData(event.currentTarget), "code").replaceAll(" ", "");
    if (!/^\d{6}$/.test(code)) {
      setError("Informe os 6 dígitos do app autenticador.");
      setInvalidField(codeId);
      event.currentTarget.querySelector<HTMLInputElement>('input[name="code"]')?.focus();
      return;
    }
    const data = await run(() => client.twoFactor.verifyTotp({ code }));
    if (data) setStep({ name: "codes", backupCodes: step.backupCodes });
  }

  async function handleRegenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = requiredPassword(event.currentTarget);
    if (password === null) return;
    const data = await run(() => client.twoFactor.generateBackupCodes({ password }));
    if (data) setStep({ name: "codes", backupCodes: data.backupCodes });
  }

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = requiredPassword(event.currentTarget);
    if (password === null) return;
    const data = await run(() => client.twoFactor.disable({ password }));
    if (data) {
      toast.success("Verificação em duas etapas desativada.");
      void revalidator.revalidate();
    }
  }

  function finish() {
    setStep({ name: "idle" });
    toast.success("Verificação em duas etapas ativa.");
    void navigate(doneHref, { replace: true, viewTransition: true });
    void revalidator.revalidate();
  }

  function stepContent() {
    if (step.name === "codes") {
      return (
        <BackupCodes
          scope={scope}
          codes={step.backupCodes}
          onDone={enabled ? () => setStep({ name: "idle" }) : finish}
        />
      );
    }
    if (step.name === "scan") {
      return (
        <form
          method="post"
          noValidate
          onSubmit={(event) => void handleVerify(event)}
          className="flex flex-col gap-4"
        >
          <ScanInstructions totpURI={step.totpURI} secret={step.secret} />
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor={codeId}>Código do app</Label>
            <Input
              id={codeId}
              name="code"
              aria-invalid={invalidField === codeId}
              aria-describedby={errorId}
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-12 text-center text-lg font-semibold tracking-[0.3em]"
            />
          </div>
          <FormError id={errorId} message={error} />
          <Button type="submit" disabled={pending} className="sm:self-start">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Confirmar e ativar
          </Button>
        </form>
      );
    }
    if (enabled) {
      return (
        <div className="grid gap-6 md:grid-cols-2">
          <form
            method="post"
            noValidate
            onSubmit={(event) => void handleRegenerate(event)}
            className="flex flex-col gap-3"
          >
            <h3 className="font-medium">Novos códigos de backup</h3>
            <p className="text-sm text-ink-muted">Os códigos antigos param de funcionar.</p>
            <PasswordField
              id={passwordId}
              invalid={invalidField === passwordId}
              errorId={errorId}
            />
            <Button type="submit" variant="outline" disabled={pending} className="self-start">
              Gerar novos códigos
            </Button>
          </form>
          {required ? null : (
            <form
              method="post"
              noValidate
              onSubmit={(event) => void handleDisable(event)}
              className="flex flex-col gap-3"
            >
              <h3 className="font-medium">Desativar</h3>
              <p className="text-sm text-ink-muted">Depois disso, basta a senha para entrar.</p>
              <PasswordField
                id={`${passwordId}-off`}
                invalid={invalidField === `${passwordId}-off`}
                errorId={errorId}
              />
              <Button type="submit" variant="outline" disabled={pending} className="self-start">
                Desativar verificação
              </Button>
            </form>
          )}
          <div className="md:col-span-2">
            <FormError id={errorId} message={error} />
          </div>
        </div>
      );
    }
    return (
      <form
        method="post"
        noValidate
        onSubmit={(event) => void handleEnable(event)}
        className="flex flex-col gap-4 sm:max-w-sm"
      >
        <PasswordField id={passwordId} invalid={invalidField === passwordId} errorId={errorId} />
        <FormError id={errorId} message={error} />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Ativar verificação
        </Button>
      </form>
    );
  }

  return (
    <section
      className={plain ? "flex flex-col gap-5" : "glass flex flex-col gap-5 rounded-2xl p-6 sm:p-8"}
      aria-labelledby={plain ? undefined : `${codeId}-titulo`}
      aria-label={plain ? "Verificação em duas etapas" : undefined}
    >
      {plain ? null : (
        <TwoFactorHeader
          titleId={`${codeId}-titulo`}
          enabled={enabled}
          required={required}
          verified={step.name === "codes"}
        />
      )}

      {stepContent()}
    </section>
  );
}

function PasswordField({
  id,
  invalid,
  errorId,
}: {
  id: string;
  invalid: boolean;
  errorId: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Confirme sua senha</Label>
      <PasswordInput
        id={id}
        name="password"
        autoComplete="current-password"
        required
        aria-invalid={invalid}
        aria-describedby={errorId}
      />
    </div>
  );
}

function ScanInstructions({ totpURI, secret }: { totpURI: string; secret: string }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <QrCode value={totpURI} label="QR code para o app autenticador" />
      <div className="flex flex-col gap-2 text-sm text-ink-muted">
        <p>
          1. Abra um app autenticador (Google Authenticator, Microsoft Authenticator, 1Password,
          Bitwarden…) e escaneie o QR code.
        </p>
        <p>2. Sem câmera? Digite a chave:</p>
        <code className="rounded-lg bg-surface-2 px-2 py-1.5 font-sans text-xs break-all text-ink tabular-nums">
          {secret}
        </code>
        <p>3. Digite o código de 6 dígitos que aparecer no app.</p>
      </div>
    </div>
  );
}
