"use client";

import { ArrowRight, Loader2, Ticket } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { upsetMascot } from "@/features/mascot/events";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { requestToken } from "@/features/room/client/api";
import { joinFailure, type JoinChoices } from "@/features/room/domain/join";
import { roomLink } from "@/features/room/domain/room-code";
import { useMicSetup } from "@/features/room/hooks/use-mic-setup";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { gsap, MOTION_QUERIES, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { formText } from "@/lib/utils";
import { InviteLinkButton } from "./InviteLinkButton";
import { MicSetup } from "./MicSetup";
import { NameRow } from "./NameRow";
import { PasswordField } from "./PasswordField";
import { PresenceLine } from "./PresenceLine";

interface PreJoinProps {
  code: string;
  /** Nome da conta logada: é como a pessoa aparece na sala. */
  userName: string;
  passwordRequired: boolean;
  /** Convite do painel: substitui a senha de acesso. */
  invite?: string;
  /** Pessoas na sala agora (null: desconhecido). */
  presence: { online: number } | null;
  maxParticipants: number;
  onJoin: (choices: JoinChoices) => void;
}

/** Pré-entrada: confere quem entra, testa o microfone, pede a senha e o token. */
export function PreJoin({
  code,
  userName,
  passwordRequired,
  invite,
  presence,
  maxParticipants,
  onJoin,
}: PreJoinProps) {
  const scope = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(userName);
  const [formError, setFormError] = useState<{ message: string; field?: "password" }>();
  const [submitting, setSubmitting] = useState(false);
  const meterRef = useRef<HTMLDivElement>(null);
  const mic = useMicSetup(submitting, meterRef);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap.fromTo(
          scope.current,
          { y: 24, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8 },
        );
        gsap.from("[data-anim=row]", { y: 12, opacity: 0, stagger: 0.06, delay: 0.15 });
      });
    },
    { scope },
  );

  // Com senha de acesso, o foco já começa no único campo que falta.
  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  /** Erro na tentativa: mensagem, foco, mascote e um tremidinho no formulário. */
  function showFailure(message: string, failure: ReturnType<typeof joinFailure>) {
    setFormError({ message, field: failure.passwordField ? "password" : undefined });
    if (failure.passwordField) passwordRef.current?.focus();
    upsetMascot(failure.mood, (failure.passwordField && passwordRef.current) || undefined);
    if (!prefersReducedMotion()) {
      gsap.fromTo(scope.current, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const password = passwordRequired
      ? formText(new FormData(event.currentTarget), "password")
      : undefined;

    if (passwordRequired && !password) {
      setFormError({
        message: "Digite a senha que recebeu de quem enviou o convite.",
        field: "password",
      });
      passwordRef.current?.focus();
      upsetMascot("grumpy", passwordRef.current ?? undefined);
      return;
    }

    setFormError(undefined);
    setSubmitting(true);
    const result = await requestToken({ room: code, password, invite });
    if (!result.ok) {
      const failure = joinFailure(result.code);
      // Sessão expirou ou e-mail ainda não confirmado: volta para a sala depois.
      if (failure.redirect) {
        const back = encodeURIComponent(roomLink(code, invite));
        const page = failure.redirect === "login" ? "/entrar" : "/verificar-email";
        window.location.assign(`${page}?voltar=${back}`);
        return;
      }
      setSubmitting(false);
      showFailure(result.message, failure);
      return;
    }

    onJoin({
      password,
      token: result.data.token,
      serverUrl: result.data.serverUrl,
      // Microfone bloqueado: entra ouvindo, em vez de falhar lá dentro.
      micEnabled: mic.enabled && !mic.blocked,
      audioDeviceId: mic.deviceId,
    });
  }

  return (
    <form
      ref={scope}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="apple-buttons flex w-full max-w-md flex-col items-center gap-6"
    >
      {/* Topo: mascote, a sala, quem já está lá e o convite para o time. */}
      <header data-anim="row" className="flex flex-col items-center gap-3 text-center">
        <Mascot
          className="size-28 sm:size-32"
          sizes="(min-width: 640px) 384px, 336px"
          canSleep={!mic.testing && !submitting}
          activity={submitting ? "waiting" : mic.testing ? "listening" : "idle"}
          voiceLevelRef={mic.levelRef}
        />
        <div className="flex flex-col items-center gap-2">
          <p className="text-base font-medium text-ink-muted">Você está entrando na sala</p>
          <h1 className="max-w-full font-mono text-3xl font-semibold tracking-tight break-all sm:text-4xl">
            {code}
          </h1>
          <PresenceLine presence={presence} max={maxParticipants} />
          {invite ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-ink">
              <Ticket className="size-3.5 text-brand-soft" aria-hidden="true" />
              Você tem convite: não precisa de senha
            </span>
          ) : null}
        </div>
        <InviteLinkButton code={code} />
      </header>

      {/* Lista agrupada (estilo Ajustes): quem você é e o seu microfone. */}
      <div
        data-anim="row"
        className="w-full divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <NameRow name={name} onChange={setName} />
        <MicSetup mic={mic} meterRef={meterRef} />
      </div>

      {passwordRequired ? (
        <PasswordField
          inputRef={passwordRef}
          error={formError?.field === "password" ? formError.message : undefined}
          onChange={() => setFormError(undefined)}
        />
      ) : null}

      {formError && !formError.field ? (
        <p className="-mt-2 w-full text-center text-base text-danger" role="alert">
          {formError.message}
        </p>
      ) : null}

      <div data-anim="row" className="flex w-full flex-col items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Entrando…" : mic.joinsMuted ? "Entrar só ouvindo" : "Entrar na sala"}
          {submitting ? null : <ArrowRight aria-hidden="true" />}
        </Button>
        <ShareSupportNote variant="badge" className="text-sm" />
        <Link
          href="/"
          className="rounded-md py-1 text-base text-ink-muted transition-colors hover:text-ink"
        >
          Voltar ao início
        </Link>
      </div>
    </form>
  );
}
