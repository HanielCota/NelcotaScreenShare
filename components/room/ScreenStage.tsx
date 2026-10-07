"use client";

import { useDataChannel, VideoTrack, type TrackReference } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { Maximize2, Minimize2, MonitorUp, MousePointerClick } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type RefObject,
} from "react";
import { toast } from "sonner";
import { useShortcut } from "@/hooks/useShortcut";
import {
  contentBox,
  decodeMessage,
  encodeMessage,
  pointerSchema,
  TOPICS,
  type PointerMessage,
} from "@/lib/room-data";
import { cn } from "@/lib/utils";

interface ScreenStageProps {
  shares: TrackReference[];
  focused: TrackReference;
  onFocus: (sid: string) => void;
}

interface Ping extends PointerMessage {
  id: number;
  name: string;
}

const PING_MS = 2500;
/** Intervalo mínimo entre pontos enviados por esta pessoa. */
const SEND_INTERVAL_MS = 150;

function sharerName(ref: TrackReference): string {
  return ref.participant.isLocal ? "Você" : ref.participant.name || ref.participant.identity;
}

function displayName(participant: Participant | undefined): string {
  return participant?.name || participant?.identity || "Alguém";
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

/** Pontos marcados na tela compartilhada (canal de dados, sem garantia de entrega). */
function usePointers() {
  const [pings, setPings] = useState<Ping[]>([]);
  const nextId = useRef(0);
  const lastSent = useRef(0);

  function add(point: PointerMessage, name: string) {
    const id = nextId.current++;
    setPings((list) => [...list.slice(-19), { ...point, id, name }]);
    setTimeout(() => setPings((list) => list.filter((ping) => ping.id !== id)), PING_MS);
  }

  const { send } = useDataChannel(TOPICS.pointer, (message) => {
    const received = decodeMessage(message.payload, pointerSchema);
    if (received) add(received, displayName(message.from));
  });

  function pointAt(message: PointerMessage) {
    const now = Date.now();
    if (now - lastSent.current < SEND_INTERVAL_MS) return;
    lastSent.current = now;
    add(message, "Você");
    send(encodeMessage(message), { reliable: false }).catch(() => {
      toast.error("Não foi possível marcar o ponto na tela.");
    });
  }

  return { pings, pointAt };
}

/** Área da imagem dentro do <video> (`object-contain` deixa faixas pretas). */
function useContentBox(videoRef: RefObject<HTMLVideoElement | null>) {
  const [box, setBox] = useState<ReturnType<typeof contentBox>>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () =>
      setBox(
        contentBox(
          { width: video.clientWidth, height: video.clientHeight },
          { width: video.videoWidth, height: video.videoHeight },
        ),
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(video);
    // "resize" dispara quando a resolução do vídeo muda (ex.: troca de janela).
    video.addEventListener("resize", update);
    video.addEventListener("loadedmetadata", update);
    return () => {
      observer.disconnect();
      video.removeEventListener("resize", update);
      video.removeEventListener("loadedmetadata", update);
    };
  }, [videoRef]);

  return box;
}

function PointerLayer({
  videoRef,
  trackSid,
  pings,
  pointing,
  onPoint,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  trackSid: string;
  pings: Ping[];
  pointing: boolean;
  onPoint?: (message: PointerMessage) => void;
}) {
  const box = useContentBox(videoRef);
  if (!box) return null;

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) onPoint?.({ trackSid, x, y });
  }

  return (
    <div
      aria-hidden="true"
      onClick={pointing ? handleClick : undefined}
      className={cn("absolute", pointing ? "cursor-crosshair" : "pointer-events-none")}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      {pings
        .filter((ping) => ping.trackSid === trackSid)
        .map((ping) => (
          <span
            key={ping.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${ping.x * 100}%`, top: `${ping.y * 100}%` }}
          >
            <span className="relative flex size-5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-5 rounded-full border-2 border-canvas bg-brand" />
            </span>
            <span className="glass rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap">
              {ping.name}
            </span>
          </span>
        ))}
    </div>
  );
}

export function ScreenStage({ shares, focused, onFocus }: ScreenStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pointing, setPointing] = useState(false);
  const { pings, pointAt } = usePointers();
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null && document.fullscreenElement === stageRef.current,
    () => false,
  );

  // O Safari do iPhone não tem tela cheia para elementos comuns: sem a API, sem o botão.
  const canFullscreen = document.fullscreenEnabled;
  const isOwnScreen = focused.participant.isLocal;
  const trackSid = focused.publication.trackSid;

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
  useShortcut("p", () => setPointing((value) => !value), !isOwnScreen);

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
            <p className="font-semibold tracking-tight">Todos na sala estão vendo sua tela</p>
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
        <span className="glass pointer-events-auto inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-soft opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-soft" />
          </span>
          {isOwnScreen ? "Você está apresentando" : `Tela de ${sharerName(focused)}`}
        </span>

        <span className="flex gap-2">
          {isOwnScreen ? null : (
            <button
              type="button"
              onClick={() => setPointing((value) => !value)}
              aria-pressed={pointing}
              aria-keyshortcuts="P"
              title="Apontar na tela (P)"
              aria-label={pointing ? "Parar de apontar" : "Apontar na tela"}
              className={cn(
                "glass pointer-events-auto grid size-9 place-items-center rounded-xl transition-colors",
                pointing ? "bg-brand! text-brand-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              <MousePointerClick className="size-4" aria-hidden="true" />
            </button>
          )}
          {canFullscreen ? (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-keyshortcuts="F"
              title={isFullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="glass pointer-events-auto grid size-9 place-items-center rounded-xl text-ink-muted transition-colors hover:text-ink"
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </span>
      </div>

      {pointing && !isOwnScreen ? (
        <p className="glass pointer-events-none absolute top-14 right-3 rounded-xl px-3 py-1.5 text-xs font-semibold">
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
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
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
