"use client";

import { createAudioAnalyser, createLocalAudioTrack, MediaDeviceFailure } from "livekit-client";
import {
  ArrowRight,
  AudioLines,
  Headphones,
  Loader2,
  Lock,
  Mic,
  MicOff,
  RotateCcw,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ShareSupportNote } from "@/features/room/ui/ShareSupportNote";
import { Mascot } from "@/features/mascot/ui/Mascot";
import { upsetMascot } from "@/features/mascot/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { gsap, MOTION_QUERIES, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { requestToken } from "@/features/room/client/api";
import { roomLink } from "@/features/room/domain/room-code";
import { saveMicrophone, savedMicrophone } from "@/features/room/client/saved-microphone";
import { cn, formText } from "@/lib/utils";
import { InviteLinkButton } from "./InviteLinkButton";
import { NameRow } from "./NameRow";
import { useMicPermission } from "@/features/room/hooks/use-mic-permission";

export interface JoinChoices {
  name: string;
  /** Só em memória: o "Tentar de novo" da sala pede um token novo com ela. */
  password?: string;
  token: string;
  serverUrl: string;
  micEnabled: boolean;
  audioDeviceId?: string;
}

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

/** O microfone salvo só muda por esta tela, que já guarda a escolha no estado. */
function subscribeNothing(): () => void {
  return () => {};
}

function micErrorMessage(error: unknown): string {
  switch (MediaDeviceFailure.getFailure(error)) {
    case MediaDeviceFailure.PermissionDenied:
      return "O navegador bloqueou o microfone.";
    case MediaDeviceFailure.NotFound:
      return "Nenhum microfone encontrado. Conecte um microfone ou fone com microfone.";
    case MediaDeviceFailure.DeviceInUse:
      return "O microfone está em uso por outro programa (outra chamada, por exemplo). Feche esse programa e tente de novo.";
    default:
      return "Não deu para usar o microfone. Confira se ele está conectado e tente de novo.";
  }
}

/** "Quem já está lá dentro": responde "estou no lugar certo? já começou?". */
function PresenceLine({ presence, max }: { presence: { online: number } | null; max: number }) {
  if (!presence) return null;
  const { online } = presence;
  if (online >= max) {
    return (
      <p className="text-base font-medium text-warning">
        A sala está cheia ({online} de {max} pessoas). Aguarde alguém sair.
      </p>
    );
  }
  if (online === 0) {
    return (
      <p className="text-base text-ink-muted">
        Ninguém na sala ainda: você será a primeira pessoa.
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-2 text-base font-semibold text-ink">
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-success/60 motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-success" />
      </span>
      {online === 1 ? "1 pessoa já está na sala" : `${online} pessoas já estão na sala`}
    </p>
  );
}

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
  const meterRef = useRef<HTMLDivElement>(null);
  const voiceLevelRef = useRef(0);
  const passwordId = useId();
  const micId = useId();
  const deviceId = useId();

  const [name, setName] = useState(userName);
  const [micEnabled, setMicEnabled] = useState(true);
  const [micError, setMicError] = useState<string>();
  const [requesting, setRequesting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const { permission, setPermission, request } = useMicPermission();
  // Escolha feita nesta tela; antes disso vale o microfone da última vez.
  // `null` é "Padrão do sistema" escolhido de propósito.
  const [chosenMic, setChosenMic] = useState<string | null>();
  const savedMic = useSyncExternalStore(subscribeNothing, savedMicrophone, () => undefined);
  const audioDeviceId = chosenMic === undefined ? savedMic : (chosenMic ?? undefined);
  const [formError, setFormError] = useState<{ message: string; field?: "password" }>();
  const [submitting, setSubmitting] = useState(false);
  // Medidor ao vivo sozinho: com a permissão dada e o microfone ligado, ninguém
  // precisa achar um botão "Testar" (leigo não testa e entra mudo).
  const testing = micEnabled && permission === "granted" && !micError && !submitting;
  const blocked = permission === "denied";

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

  // Medidor: captura local + nível da voz (sem re-render por frame).
  useEffect(() => {
    const meter = meterRef.current;
    if (!testing || !meter) return;
    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      try {
        const track = await createLocalAudioTrack({
          deviceId: audioDeviceId,
          echoCancellation: true,
          noiseSuppression: true,
        });
        if (cancelled) {
          track.stop();
          return;
        }
        const analyser = createAudioAnalyser(track, { cloneTrack: false });
        cleanup = () => {
          void analyser.cleanup();
          track.stop();
        };

        const list = await navigator.mediaDevices.enumerateDevices();
        // Cancelado durante o await: a limpeza já rodou, então não inicia o medidor.
        if (cancelled) return;
        const inputs = list.filter((d) => d.kind === "audioinput" && d.deviceId);
        setDevices(inputs);
        // Microfone salvo que sumiu (desconectado): volta para o padrão do sistema.
        if (audioDeviceId && !inputs.some((d) => d.deviceId === audioDeviceId)) {
          setChosenMic(null);
        }

        const tick = () => {
          const volume = Math.min(1, analyser.calculateVolume() * 2.5);
          voiceLevelRef.current = volume;
          meter.style.transform = `scaleX(${volume.toFixed(3)})`;
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch (error) {
        if (cancelled) return;
        if (MediaDeviceFailure.getFailure(error) === MediaDeviceFailure.PermissionDenied) {
          setPermission("denied");
        } else {
          setMicError(micErrorMessage(error));
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup?.();
      meter.style.transform = "scaleX(0)";
      voiceLevelRef.current = 0;
    };
  }, [testing, audioDeviceId, setPermission]);

  async function askPermission() {
    setRequesting(true);
    setMicError(undefined);
    const error = await request();
    setRequesting(false);
    if (error && !(error instanceof DOMException && error.name === "NotAllowedError")) {
      setMicError(micErrorMessage(error));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    const password = passwordRequired ? formText(data, "password") : undefined;

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
      // Sessão expirou ou e-mail ainda não confirmado: volta para a sala depois.
      if (result.code === "unauthenticated" || result.code === "email_unverified") {
        const back = encodeURIComponent(roomLink(code, invite));
        window.location.assign(
          result.code === "unauthenticated"
            ? `/entrar?voltar=${back}`
            : `/verificar-email?voltar=${back}`,
        );
        return;
      }
      setSubmitting(false);
      setFormError({
        message: result.message,
        field: result.code === "invalid_password" ? "password" : undefined,
      });
      // Erro da tentativa (senha, dados) deixa bravo; falha de servidor ou rede, preocupado.
      if (result.code === "invalid_password") {
        passwordRef.current?.focus();
        upsetMascot("grumpy", passwordRef.current ?? undefined);
      } else if (result.code === "invalid_request") {
        upsetMascot("grumpy");
      } else {
        upsetMascot("worried");
      }
      if (!prefersReducedMotion()) {
        gsap.fromTo(scope.current, { x: -6 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
      }
      return;
    }

    onJoin({
      name,
      password,
      token: result.data.token,
      serverUrl: result.data.serverUrl,
      // Microfone bloqueado: entra ouvindo, em vez de falhar lá dentro.
      micEnabled: micEnabled && !blocked,
      audioDeviceId,
    });
  }

  const joinsMuted = !micEnabled || blocked;

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
          canSleep={!testing && !submitting}
          activity={submitting ? "waiting" : testing ? "listening" : "idle"}
          voiceLevelRef={voiceLevelRef}
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

        <fieldset className="flex min-w-0 flex-col gap-3 px-4 py-3">
          <legend className="sr-only">Microfone</legend>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                joinsMuted ? "bg-danger/15 text-danger" : "bg-brand/15 text-brand-soft",
              )}
            >
              {joinsMuted ? <MicOff className="size-4.5" /> : <Mic className="size-4.5" />}
            </span>
            <Label htmlFor={micId} className="min-w-0 flex-1 flex-col items-start gap-0">
              <span className="text-sm font-normal text-ink-muted">Microfone</span>
              <span className="text-lg font-semibold">
                {!micEnabled
                  ? "Desligado: você entra só ouvindo"
                  : blocked
                    ? "Bloqueado pelo navegador"
                    : "Ligado ao entrar"}
              </span>
            </Label>
            <Switch
              id={micId}
              checked={micEnabled}
              onCheckedChange={(checked) => {
                setMicEnabled(checked);
                setMicError(undefined);
              }}
            />
          </div>

          {micEnabled ? (
            <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3">
              {blocked ? (
                // Bloqueado: o passo a passo para liberar, à vista.
                <div className="flex flex-col gap-3 text-base">
                  <p className="flex items-start gap-2 font-semibold text-warning">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    O navegador bloqueou o microfone neste site.
                  </p>
                  <ol className="flex list-decimal flex-col gap-1.5 pl-10 text-ink">
                    <li>
                      Clique no <strong className="text-ink">cadeado 🔒</strong> ao lado do endereço
                      do site, lá em cima.
                    </li>
                    <li>
                      Em <strong className="text-ink">Microfone</strong>, escolha{" "}
                      <strong className="text-ink">Permitir</strong>.
                    </li>
                    <li>Volte aqui: a barra de voz aparece sozinha.</li>
                  </ol>
                  <p className="pl-6 text-sm text-ink-muted">
                    Se preferir, entre assim mesmo: você ouve tudo e liga o microfone depois.
                  </p>
                </div>
              ) : permission === "granted" && !micError ? (
                // Liberado: a barra mexe com a voz, sem precisar testar.
                <>
                  <div className="flex items-center gap-2.5">
                    <AudioLines className="size-4 shrink-0 text-brand-soft" aria-hidden="true" />
                    <div
                      aria-hidden="true"
                      className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-3"
                    >
                      <div
                        ref={meterRef}
                        className="absolute inset-0 origin-left scale-x-0 rounded-full bg-linear-to-r from-brand to-brand-soft"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Fale algo: se a barra se mexer, seu microfone está funcionando.
                  </p>
                  {devices.length > 1 ? (
                    <div className="flex items-center gap-2.5">
                      <Label
                        htmlFor={deviceId}
                        className="shrink-0 text-base font-normal text-ink-muted"
                      >
                        Usar
                      </Label>
                      <select
                        id={deviceId}
                        value={audioDeviceId ?? ""}
                        onChange={(event) => {
                          const id = event.target.value || undefined;
                          setChosenMic(id ?? null);
                          saveMicrophone(id);
                        }}
                        className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-base text-ink"
                      >
                        <option value="">Padrão do sistema</option>
                        {devices.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microfone ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <p className="flex items-start gap-2 text-sm text-ink-muted">
                    <Headphones className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Dica: com fone de ouvido, ninguém escuta eco.
                  </p>
                </>
              ) : micError ? (
                // Outro problema (sem microfone, em uso): o que fazer e tentar de novo.
                <div className="flex flex-col gap-3">
                  <p className="text-base text-warning">{micError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="self-start"
                    onClick={() => setMicError(undefined)}
                  >
                    <RotateCcw aria-hidden="true" />
                    Tentar de novo
                  </Button>
                </div>
              ) : (
                // Ainda não permitido: explicar antes que o navegador pergunte.
                <div className="flex flex-col gap-3">
                  <p className="text-base text-ink">
                    Para os outros te ouvirem, o navegador vai pedir para usar o microfone. Clique
                    em <strong className="text-ink">Permitir</strong> quando aparecer.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={requesting}
                    onClick={() => void askPermission()}
                  >
                    {requesting ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Mic aria-hidden="true" />
                    )}
                    {requesting ? "Esperando você permitir…" : "Permitir microfone"}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </fieldset>
      </div>

      {passwordRequired ? (
        <div
          data-anim="row"
          data-invalid={formError?.field === "password" || undefined}
          className="flex w-full flex-col gap-2"
        >
          <Label htmlFor={passwordId} className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5 text-ink-subtle" aria-hidden="true" />
            Senha da sala (quem te convidou sabe)
          </Label>
          <Input
            ref={passwordRef}
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            className="h-12 rounded-full px-5"
            aria-invalid={formError?.field === "password" || undefined}
            aria-describedby={formError?.field === "password" ? `${passwordId}-error` : undefined}
            onChange={() => setFormError(undefined)}
          />
          {formError?.field === "password" ? (
            <p id={`${passwordId}-error`} className="text-sm text-danger" role="alert">
              {formError.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {formError && !formError.field ? (
        <p className="-mt-2 w-full text-center text-base text-danger" role="alert">
          {formError.message}
        </p>
      ) : null}

      <div data-anim="row" className="flex w-full flex-col items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Entrando…" : joinsMuted ? "Entrar só ouvindo" : "Entrar na sala"}
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
