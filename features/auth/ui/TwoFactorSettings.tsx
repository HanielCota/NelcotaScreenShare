"use client";

import { Check, Copy, Download, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { formText } from "@/lib/utils";

type Step =
  | { name: "idle" }
  | { name: "scan"; totpURI: string; backupCodes: string[] }
  | { name: "codes"; backupCodes: string[] };

function secretFrom(uri: string): string {
  return new URL(uri).searchParams.get("secret") ?? "";
}

function BackupCodes({
  codes,
  onDone,
  scope,
}: {
  codes: string[];
  onDone: () => void;
  scope: "admin" | "user";
}) {
  const text = codes.join("\n");
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Guarde estes códigos num lugar seguro (gerenciador de senhas). Cada um entra uma única vez
        se você perder o app autenticador.{" "}
        <strong className="text-ink">Eles não aparecem de novo.</strong>
      </p>
      <ol className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(
              () => toast.success("Códigos copiados."),
              () => toast.error("Não foi possível copiar. Use o botão Baixar .txt."),
            )
          }
        >
          <Copy aria-hidden="true" />
          Copiar
        </Button>
        <Button type="button" variant="outline" asChild>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Códigos de backup ${scope === "admin" ? "do painel " : "do "}Nelcota\n\n${text}\n`)}`}
            download={`nelcota${scope === "admin" ? "-admin" : ""}-codigos-backup.txt`}
          >
            <Download aria-hidden="true" />
            Baixar .txt
          </a>
        </Button>
        <Button type="button" onClick={onDone} className="ml-auto">
          <Check aria-hidden="true" />
          Guardei os códigos
        </Button>
      </div>
    </div>
  );
}

export function TwoFactorSettings({
  scope,
  enabled,
  required,
  doneHref,
}: {
  /** Qual instância do Better Auth: painel admin ou conta de participante. */
  scope: "admin" | "user";
  enabled: boolean;
  /** O papel exige 2FA (owner/admin): não dá para desativar. */
  required: boolean;
  /** Para onde ir depois de ativar. */
  doneHref: string;
}) {
  const client = scope === "admin" ? adminAuthClient : authClient;
  const router = useRouter();
  const passwordId = useId();
  const codeId = useId();
  const [step, setStep] = useState<Step>({ name: "idle" });
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function run<T>(fn: () => Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
    setPending(true);
    setError(undefined);
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
    const password = formText(new FormData(event.currentTarget), "password");
    const data = await run(() => client.twoFactor.enable({ password }));
    // O painel só usa TOTP (app autenticador); "otp" seria código por e-mail.
    if (data?.method === "totp") {
      setStep({ name: "scan", totpURI: data.totpURI, backupCodes: data.backupCodes });
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.name !== "scan") return;
    const code = formText(new FormData(event.currentTarget), "code").replaceAll(" ", "");
    const data = await run(() => client.twoFactor.verifyTotp({ code }));
    if (data) setStep({ name: "codes", backupCodes: step.backupCodes });
  }

  async function handleRegenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = formText(new FormData(event.currentTarget), "password");
    const data = await run(() => client.twoFactor.generateBackupCodes({ password }));
    if (data) setStep({ name: "codes", backupCodes: data.backupCodes });
  }

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = formText(new FormData(event.currentTarget), "password");
    const data = await run(() => client.twoFactor.disable({ password }));
    if (data) {
      toast.success("Verificação em duas etapas desativada.");
      router.refresh();
    }
  }

  function finish() {
    setStep({ name: "idle" });
    toast.success("Verificação em duas etapas ativa.");
    router.replace(doneHref);
    router.refresh();
  }

  const passwordField = (
    <div className="flex flex-col gap-2">
      <Label htmlFor={passwordId}>Confirme sua senha</Label>
      <PasswordInput id={passwordId} name="password" autoComplete="current-password" required />
    </div>
  );

  return (
    <section
      className="glass flex flex-col gap-5 rounded-2xl p-6 sm:p-8"
      aria-labelledby={`${codeId}-titulo`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2">
          {enabled || step.name === "codes" ? (
            <ShieldCheck className="size-5 text-brand-soft" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-5 text-warning" aria-hidden="true" />
          )}
        </span>
        <div>
          <h2 id={`${codeId}-titulo`} className="text-lg font-bold tracking-tight">
            Verificação em duas etapas
          </h2>
          <p className="text-sm text-ink-muted">
            {enabled
              ? "Ativa. Além da senha, o login pede um código do seu app autenticador."
              : required
                ? "Obrigatória para o seu papel. Ative para usar o painel."
                : "Recomendada: protege a conta mesmo se a senha vazar."}
          </p>
        </div>
      </div>

      {step.name === "codes" ? (
        <BackupCodes
          scope={scope}
          codes={step.backupCodes}
          onDone={enabled ? () => setStep({ name: "idle" }) : finish}
        />
      ) : step.name === "scan" ? (
        <form onSubmit={(event) => void handleVerify(event)} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <QrCode value={step.totpURI} label="QR code para o app autenticador" />
            <div className="flex flex-col gap-2 text-sm text-ink-muted">
              <p>
                1. Abra um app autenticador (Google Authenticator, Microsoft Authenticator,
                1Password, Bitwarden…) e escaneie o QR code.
              </p>
              <p>2. Sem câmera? Digite a chave:</p>
              <code className="rounded-lg bg-surface-2 px-2 py-1.5 font-mono text-xs break-all text-ink">
                {secretFrom(step.totpURI)}
              </code>
              <p>3. Digite o código de 6 dígitos que aparecer no app.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor={codeId}>Código do app</Label>
            <Input
              id={codeId}
              name="code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="h-12 text-center text-lg font-semibold tracking-[0.3em]"
            />
          </div>
          <FormError message={error} />
          <Button type="submit" disabled={pending} className="sm:self-start">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Confirmar e ativar
          </Button>
        </form>
      ) : enabled ? (
        <div className="grid gap-6 md:grid-cols-2">
          <form onSubmit={(event) => void handleRegenerate(event)} className="flex flex-col gap-3">
            <h3 className="font-semibold">Novos códigos de backup</h3>
            <p className="text-sm text-ink-muted">Os códigos antigos param de funcionar.</p>
            {passwordField}
            <Button type="submit" variant="outline" disabled={pending} className="self-start">
              Gerar novos códigos
            </Button>
          </form>
          {required ? null : (
            <form onSubmit={(event) => void handleDisable(event)} className="flex flex-col gap-3">
              <h3 className="font-semibold">Desativar</h3>
              <p className="text-sm text-ink-muted">O login volta a pedir só a senha.</p>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${passwordId}-off`}>Confirme sua senha</Label>
                <PasswordInput
                  id={`${passwordId}-off`}
                  name="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" variant="outline" disabled={pending} className="self-start">
                Desativar verificação
              </Button>
            </form>
          )}
          <div className="md:col-span-2">
            <FormError message={error} />
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => void handleEnable(event)}
          className="flex flex-col gap-4 sm:max-w-sm"
        >
          {passwordField}
          <FormError message={error} />
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Ativar verificação
          </Button>
        </form>
      )}
    </section>
  );
}
