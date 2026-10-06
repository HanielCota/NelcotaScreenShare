"use client";

import { ExternalLink, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthCard } from "./AuthCard";
import { celebrateMascot, upsetMascot } from "@/components/mascot/events";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/client/participant-auth-client";
import { inboxLink } from "@/features/auth/domain/email-suggest";

/** O servidor aceita um reenvio por minuto; a contagem evita o clique recusado. */
const RESEND_COOLDOWN = 60;

/** Depois do cadastro (ou ao tentar entrar numa sala sem confirmar o e-mail). */
export function VerifyEmailPanel({
  email,
  returnTo,
}: {
  email: string | undefined;
  returnTo: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "wait">("idle");
  // Começa contando: quem chega aqui acabou de receber um link.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inbox = email ? inboxLink(email) : undefined;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0) return;
    setStatus("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: returnTo });
    setCooldown(RESEND_COOLDOWN);
    if (error?.status === 429) {
      setStatus("wait");
      upsetMascot("worried");
    } else {
      setStatus("sent");
      celebrateMascot();
    }
  }

  return (
    <AuthCard
      icon={MailCheck}
      title="Confirme seu e-mail"
      description={
        email ? (
          <>
            Enviamos um link para <strong className="break-all text-ink">{email}</strong>. Abra o
            e-mail e toque em “Confirmar e-mail”. O link vale por 24 horas.
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
        {inbox ? (
          <Button asChild size="lg" className="w-full">
            <a href={inbox.href} target="_blank" rel="noopener noreferrer">
              {inbox.label}
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : null}
        <p className="text-sm text-ink-subtle">Não chegou? Veja a caixa de spam e as promoções.</p>
        {email ? (
          <Button
            variant="outline"
            size="lg"
            disabled={status === "sending" || cooldown > 0}
            onClick={() => void resend()}
          >
            {status === "sending" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {cooldown > 0
              ? `Reenviar em ${cooldown} s`
              : status === "sent"
                ? "Reenviar de novo"
                : "Reenviar link"}
          </Button>
        ) : null}
        <p aria-live="polite" className="text-sm">
          {status === "sent" ? (
            <span className="text-success">Link reenviado. Confira o e-mail.</span>
          ) : null}
          {status === "wait" ? (
            <span className="text-danger">Aguarde um minuto antes de pedir outro link.</span>
          ) : null}
        </p>
      </div>
    </AuthCard>
  );
}
