"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Depois do cadastro (ou ao tentar entrar numa sala sem confirmar o e-mail). */
export function VerifyEmailPanel({
  email,
  returnTo,
}: {
  email: string | undefined;
  returnTo: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "wait">("idle");

  async function resend() {
    if (!email) return;
    setStatus("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: returnTo });
    setStatus(error?.status === 429 ? "wait" : "sent");
  }

  return (
    <AuthCard
      icon={MailCheck}
      title="Confirme seu e-mail"
      description={
        email ? (
          <>
            Enviamos um link para <strong className="text-ink">{email}</strong>. Abra o e-mail e
            toque em “Confirmar e-mail” para entrar em salas. O link vale por 24 horas.
          </>
        ) : (
          "Enviamos um link de confirmação para o seu e-mail. Abra e toque em “Confirmar e-mail”."
        )
      }
      footer={
        <Link
          href={`/entrar?voltar=${encodeURIComponent(returnTo)}`}
          className="font-semibold text-brand-soft hover:underline"
        >
          Já confirmei: entrar
        </Link>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-subtle">Não chegou? Veja a caixa de spam.</p>
        {email ? (
          <Button
            variant="outline"
            disabled={status === "sending" || status === "sent"}
            onClick={() => void resend()}
          >
            {status === "sending" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {status === "sent" ? "Link reenviado" : "Reenviar link"}
          </Button>
        ) : null}
        {status === "wait" ? (
          <p role="alert" className="text-sm text-danger">
            Aguarde um minuto antes de pedir outro link.
          </p>
        ) : null}
      </div>
    </AuthCard>
  );
}
