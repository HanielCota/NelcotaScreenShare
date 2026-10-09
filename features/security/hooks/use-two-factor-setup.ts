import { useNavigate, useRevalidator } from "react-router";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { adminAuthClient } from "@/features/auth/client/admin-auth-client";
import { callAuth } from "@/features/auth/client/auth-call";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { authErrorMessage } from "@/features/auth/domain/auth-errors";
import { formText } from "@/lib/utils";

type TwoFactorStep =
  | { name: "idle" }
  | { name: "scan"; totpURI: string; secret: string; backupCodes: string[] }
  | { name: "codes"; backupCodes: string[] };

/** Enable, verify, regenerate and disable flows of the 2FA settings, with their form state. */
export function useTwoFactorSetup({
  scope,
  doneHref,
  codeId,
}: {
  scope: "admin" | "user";
  doneHref: string;
  codeId: string;
}) {
  const client = scope === "admin" ? adminAuthClient : authClient;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [step, setStep] = useState<TwoFactorStep>({ name: "idle" });
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
    const { data, error: failure } = await callAuth(fn);
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

  function backToIdle() {
    setStep({ name: "idle" });
  }

  function finish() {
    setStep({ name: "idle" });
    toast.success("Verificação em duas etapas ativa.");
    void navigate(doneHref, { replace: true, viewTransition: true });
    void revalidator.revalidate();
  }

  return {
    step,
    error,
    pending,
    invalidField,
    handleEnable,
    handleVerify,
    handleRegenerate,
    handleDisable,
    backToIdle,
    finish,
  };
}
