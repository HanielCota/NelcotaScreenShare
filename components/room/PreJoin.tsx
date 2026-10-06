"use client";

import { createAudioAnalyser, createLocalAudioTrack, MediaDeviceFailure } from "livekit-client";
import { ArrowRight, Loader2, Lock, Mic, MicOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Mascot } from "@/components/Mascot";
import { upsetMascot } from "@/components/mascot/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { gsap, MOTION_QUERIES, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { requestToken, roomPath } from "@/lib/livekit";
import { saveMicrophone, savedMicrophone } from "@/lib/room-data";
import { cn, formText } from "@/lib/utils";

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
  onJoin: (choices: JoinChoices) => void;
}

/** O microfone salvo só muda por esta tela, que já guarda a escolha no estado. */
function subscribeNothing(): () => void {
  return () => {};
}

function micErrorMessage(error: unknown): string {
  switch (MediaDeviceFailure.getFailure(error)) {
    case MediaDeviceFailure.PermissionDenied:
      return "Permita o uso do microfone nas permissões deste site no navegador e teste novamente.";
    case MediaDeviceFailure.NotFound:
      return "Nenhum microfone encontrado. Conecte um microfone e teste novamente, ou entre com ele desligado.";
    case MediaDeviceFailure.DeviceInUse:
      return "O microfone está em uso. Feche outros aplicativos que possam estar usando ele e teste novamente.";
    default:
      return "Não foi possível usar o microfone. Confira o dispositivo e as permissões deste site, ou entre com ele desligado.";
  }
}

export function PreJoin({ code, userName, passwordRequired, onJoin }: PreJoinProps) {
  const scope = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const passwordId = useId();
  const micId = useId();
  const deviceId = useId();

  const [testing, setTesting] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [micError, setMicError] = useState<string>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  // Escolha feita nesta tela; antes disso vale o microfone da última vez.
  // `null` é "Padrão do sistema" escolhido de propósito.
  const [chosenMic, setChosenMic] = useState<string | null>();
  const savedMic = useSyncExternalStore(subscribeNothing, savedMicrophone, () => undefined);
  const audioDeviceId = chosenMic === undefined ? savedMic : (chosenMic ?? undefined);
  const [formError, setFormError] = useState<{ message: string; field?: "password" }>();
  const [submitting, setSubmitting] = useState(false);

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

  // Teste de microfone: captura local + medidor de nível (sem re-render por frame).
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
          meter.style.transform = `scaleX(${volume.toFixed(3)})`;
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch (error) {
        if (!cancelled) {
          setMicError(micErrorMessage(error));
          setTesting(false);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup?.();
      meter.style.transform = "scaleX(0)";
    };
  }, [testing, audioDeviceId]);

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
    setTesting(false);

    const result = await requestToken({ room: code, password });
    if (!result.ok) {
      // Sessão expirou ou e-mail ainda não confirmado: volta para a sala depois.
      if (result.code === "unauthenticated" || result.code === "email_unverified") {
        const back = encodeURIComponent(roomPath(code));
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
      name: userName,
      password,
      token: result.data.token,
      serverUrl: result.data.serverUrl,
      micEnabled,
      audioDeviceId,
    });
  }

  return (
    <form
      ref={scope}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      className="glass flex w-full max-w-md flex-col gap-6 rounded-2xl p-6 sm:p-8"
    >
      <header data-anim="row" className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-subtle">Pronto para entrar?</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            Sala <span className="block text-brand-soft">{code}</span>
          </h1>
        </div>
        <Mascot className="size-20 sm:size-24" sizes="(min-width: 640px) 288px, 240px" />
      </header>

      <div
        data-anim="row"
        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-4 py-3"
      >
        <p className="min-w-0 text-sm text-ink-muted">
          Você vai entrar como{" "}
          <strong className="block truncate text-base font-semibold text-ink">{userName}</strong>
        </p>
        <Link
          href={`/conta?voltar=${encodeURIComponent(roomPath(code))}`}
          className="shrink-0 text-sm font-semibold text-brand-soft hover:underline"
        >
          Mudar nome
        </Link>
      </div>

      {passwordRequired ? (
        <div
          data-anim="row"
          data-invalid={formError?.field === "password" || undefined}
          className="flex flex-col gap-2"
        >
          <Label htmlFor={passwordId} className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5 text-ink-subtle" aria-hidden="true" />
            Senha de acesso
          </Label>
          <Input
            ref={passwordRef}
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
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

      <fieldset
        data-anim="row"
        className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface/60 p-4"
      >
        <legend className="sr-only">Microfone</legend>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl",
                micEnabled ? "bg-brand/15 text-brand-soft" : "bg-surface-3 text-ink-subtle",
              )}
            >
              {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </div>
            <Label htmlFor={micId} className="min-w-0 flex-col items-start gap-1">
              <span className="text-sm font-semibold">Microfone</span>
              <span className="max-w-full text-xs leading-relaxed font-normal text-ink-subtle">
                {micEnabled ? "Entrar com o microfone ligado" : "Entrar mutado"}
              </span>
            </Label>
          </div>
          <Switch id={micId} checked={micEnabled} onCheckedChange={setMicEnabled} />
        </div>

        <div className="flex items-center gap-3">
          <span className="sr-only">
            {testing ? "Teste de microfone em andamento: fale algo." : "Teste de microfone parado."}
          </span>
          <div
            aria-hidden="true"
            className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              ref={meterRef}
              className="absolute inset-0 origin-left scale-x-0 rounded-full bg-linear-to-r from-brand to-brand-soft"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMicError(undefined);
              setTesting((value) => !value);
            }}
            className="h-8 rounded-lg px-3"
          >
            {testing ? "Parar teste" : "Testar"}
          </Button>
        </div>

        {devices.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={deviceId} className="text-xs text-ink-subtle">
              Dispositivo
            </Label>
            <select
              id={deviceId}
              value={audioDeviceId ?? ""}
              onChange={(event) => {
                const id = event.target.value || undefined;
                setChosenMic(id ?? null);
                saveMicrophone(id);
              }}
              className="h-9 rounded-lg border border-line bg-surface-2 px-2.5 text-sm text-ink"
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

        {micError ? <output className="text-xs text-warning">{micError}</output> : null}
      </fieldset>

      {formError && !formError.field ? (
        <p className="-mt-2 text-sm text-danger" role="alert">
          {formError.message}
        </p>
      ) : null}

      <div data-anim="row" className="flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Entrando…" : "Entrar agora"}
          {submitting ? null : <ArrowRight aria-hidden="true" />}
        </Button>
        <Link
          href="/"
          className="self-center rounded-md text-sm text-ink-subtle transition-colors hover:text-ink"
        >
          Voltar ao início
        </Link>
      </div>
    </form>
  );
}
