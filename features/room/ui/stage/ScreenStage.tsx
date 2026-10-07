import { VideoTrack, type TrackReference } from "@livekit/components-react";
import { Maximize2, Minimize2, MonitorUp, MousePointerClick } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Hint } from "@/components/Hint";
import { useShortcut } from "@/lib/hooks/use-shortcut";
import { participantName } from "@/features/room/domain/participant-label";
import { cn } from "@/lib/utils";
import { PointerLayer, usePointers } from "./PointerLayer";

interface ScreenStageProps {
  shares: TrackReference[];
  focused: TrackReference;
  onFocus: (sid: string) => void;
}

function sharerName(ref: TrackReference): string {
  return ref.participant.isLocal ? "Você" : participantName(ref.participant);
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/** Pontos marcados na tela compartilhada (canal de dados, sem garantia de entrega). */
export function ScreenStage({ shares, focused, onFocus }: ScreenStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // O modo de apontar vale para a tela em que foi ligado: trocar de tela desliga.
  const [pointingAt, setPointingAt] = useState<string>();
  const { pings, pointAt } = usePointers();
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null && document.fullscreenElement === stageRef.current,
    () => false,
  );

  // O Safari do iPhone não tem tela cheia para elementos comuns: sem a API, sem o botão.
  const canFullscreen = document.fullscreenEnabled;
  const tooltipContainer = isFullscreen ? document.fullscreenElement : undefined;
  const fullscreenLabel = isFullscreen ? "Sair da tela cheia" : "Tela cheia";
  const isOwnScreen = focused.participant.isLocal;
  const trackSid = focused.publication.trackSid;
  const pointing = !isOwnScreen && pointingAt === trackSid;
  const togglePointing = () => setPointingAt(pointing ? undefined : trackSid);

  async function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      toast.error("Não foi possível alternar a tela cheia.");
    }
  }

  useShortcut("f", () => void toggleFullscreen(), canFullscreen);
  useShortcut("p", togglePointing, !isOwnScreen);

  return (
    <section
      ref={stageRef}
      data-flip-id="stage"
      data-mascot-stage=""
      aria-label={`Tela compartilhada por ${sharerName(focused)}`}
      className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-black shadow-soft"
    >
      {isOwnScreen ? (
        // Sua própria tela em tamanho grande cria o efeito espelho (tela dentro da tela).
        <div className="flex size-full flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-line bg-black">
            <VideoTrack
              ref={videoRef}
              trackRef={focused}
              className="size-full object-contain"
              aria-label="Prévia da sua tela"
            />
            <PointerLayer
              key={trackSid}
              videoRef={videoRef}
              trackSid={trackSid}
              pings={pings}
              pointing={false}
            />
          </div>
          <div className="flex max-w-sm flex-col gap-1.5">
            <p className="font-medium tracking-tight">Todos na sala estão vendo sua tela</p>
            <p className="text-sm text-ink-subtle">
              A prévia fica pequena para evitar o efeito espelho. Quando alguém apontar algo, o
              ponto aparece aqui.
            </p>
          </div>
        </div>
      ) : (
        <>
          <VideoTrack
            ref={videoRef}
            trackRef={focused}
            className="size-full object-contain"
            aria-label={`Tela de ${sharerName(focused)}`}
          />
          <PointerLayer
            // Outra tela no palco: remonta para medir o vídeo novo.
            key={trackSid}
            videoRef={videoRef}
            trackSid={trackSid}
            pings={pings}
            pointing={pointing}
            onPoint={pointAt}
          />
        </>
      )}

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        <span className="glass pointer-events-auto inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-soft opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-soft" />
          </span>
          {isOwnScreen ? "Você está apresentando" : `Tela de ${sharerName(focused)}`}
        </span>

        <span className="flex gap-2">
          {isOwnScreen ? null : (
            <Hint
              container={tooltipContainer}
              text={pointing ? "Parar de apontar (P)" : "Apontar na tela (P)"}
            >
              <button
                type="button"
                onClick={togglePointing}
                aria-pressed={pointing}
                aria-keyshortcuts="P"
                aria-label={pointing ? "Parar de apontar" : "Apontar na tela"}
                className={cn(
                  "glass pointer-events-auto grid size-9 place-items-center rounded-xl transition-colors",
                  pointing ? "bg-brand! text-brand-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                <MousePointerClick className="size-4" aria-hidden="true" />
              </button>
            </Hint>
          )}
          {canFullscreen ? (
            <Hint container={tooltipContainer} text={`${fullscreenLabel} (F)`}>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-keyshortcuts="F"
                aria-label={fullscreenLabel}
                className="glass pointer-events-auto grid size-9 place-items-center rounded-xl text-ink-muted transition-colors hover:text-ink"
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-4" aria-hidden="true" />
                )}
              </button>
            </Hint>
          ) : null}
        </span>
      </div>

      {pointing && !isOwnScreen ? (
        <p className="glass pointer-events-none absolute top-14 right-3 rounded-xl px-3 py-1.5 text-xs font-medium">
          Clique na tela para apontar. Todos veem o ponto.
        </p>
      ) : null}

      {shares.length > 1 ? (
        <div
          role="tablist"
          aria-label="Telas compartilhadas"
          className="glass absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-xl p-1"
        >
          {shares.map((share) => {
            const sid = share.publication.trackSid;
            const active = sid === trackSid;
            return (
              <button
                key={sid}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFocus(sid)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-brand text-brand-ink"
                    : "text-ink-muted hover:bg-surface-3 hover:text-ink",
                )}
              >
                <MonitorUp className="size-3.5" aria-hidden="true" />
                {sharerName(share)}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
