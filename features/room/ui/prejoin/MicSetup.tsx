"use client";

import { AudioLines, Headphones, Loader2, Mic, MicOff, RotateCcw, ShieldAlert } from "lucide-react";
import { useId, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MicSetupState } from "@/features/room/hooks/use-mic-setup";
import { cn } from "@/lib/utils";

/** Linha "Microfone" da pré-entrada: liga/desliga e, ligado, o que fazer em cada situação. */
export function MicSetup({
  mic,
  meterRef,
}: {
  mic: MicSetupState;
  /** Barra do medidor (escrita direto, sem re-render). */
  meterRef: RefObject<HTMLDivElement | null>;
}) {
  const micId = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 px-4 py-3">
      <legend className="sr-only">Microfone</legend>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
            mic.joinsMuted ? "bg-danger/15 text-danger" : "bg-brand/15 text-brand-soft",
          )}
        >
          {mic.joinsMuted ? <MicOff className="size-4.5" /> : <Mic className="size-4.5" />}
        </span>
        <Label htmlFor={micId} className="min-w-0 flex-1 flex-col items-start gap-0">
          <span className="text-sm font-normal text-ink-muted">Microfone</span>
          <span className="text-lg font-semibold">
            {!mic.enabled
              ? "Desligado: você entra só ouvindo"
              : mic.blocked
                ? "Bloqueado pelo navegador"
                : "Ligado ao entrar"}
          </span>
        </Label>
        <Switch
          id={micId}
          checked={mic.enabled}
          onCheckedChange={(checked) => mic.setEnabled(checked)}
        />
      </div>

      {mic.enabled ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3">
          <MicStatus mic={mic} meterRef={meterRef} />
        </div>
      ) : null}
    </fieldset>
  );
}

function MicStatus({
  mic,
  meterRef,
}: {
  mic: MicSetupState;
  meterRef: RefObject<HTMLDivElement | null>;
}) {
  if (mic.blocked) return <BlockedSteps />;
  if (mic.permission === "granted" && !mic.error)
    return <LiveMeter mic={mic} meterRef={meterRef} />;
  if (mic.error) {
    // Outro problema (sem microfone, em uso): o que fazer e tentar de novo.
    return (
      <div className="flex flex-col gap-3">
        <p className="text-base text-warning">{mic.error}</p>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="self-start"
          onClick={mic.clearError}
        >
          <RotateCcw aria-hidden="true" />
          Tentar de novo
        </Button>
      </div>
    );
  }
  // Ainda não permitido: explicar antes que o navegador pergunte.
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base text-ink">
        Para os outros te ouvirem, o navegador vai pedir para usar o microfone. Clique em{" "}
        <strong className="text-ink">Permitir</strong> quando aparecer.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={mic.requesting}
        onClick={() => void mic.askPermission()}
      >
        {mic.requesting ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Mic aria-hidden="true" />
        )}
        {mic.requesting ? "Esperando você permitir…" : "Permitir microfone"}
      </Button>
    </div>
  );
}

/** Bloqueado: o passo a passo para liberar, à vista. */
function BlockedSteps() {
  return (
    <div className="flex flex-col gap-3 text-base">
      <p className="flex items-start gap-2 font-semibold text-warning">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />O navegador bloqueou o
        microfone neste site.
      </p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-10 text-ink">
        <li>
          Clique no <strong className="text-ink">cadeado 🔒</strong> ao lado do endereço do site, lá
          em cima.
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
  );
}

/** Liberado: a barra mexe com a voz, sem precisar testar. */
function LiveMeter({
  mic,
  meterRef,
}: {
  mic: MicSetupState;
  meterRef: RefObject<HTMLDivElement | null>;
}) {
  const deviceId = useId();
  return (
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
      {mic.devices.length > 1 ? (
        <div className="flex items-center gap-2.5">
          <Label htmlFor={deviceId} className="shrink-0 text-base font-normal text-ink-muted">
            Usar
          </Label>
          <select
            id={deviceId}
            value={mic.deviceId ?? ""}
            onChange={(event) => mic.choose(event.target.value || undefined)}
            className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-base text-ink"
          >
            <option value="">Padrão do sistema</option>
            {mic.devices.map((device, index) => (
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
  );
}
