"use client";

import { VideoTrack, type TrackReference } from "@livekit/components-react";
import { Maximize2, Minimize2, MonitorUp } from "lucide-react";
import { useSyncExternalStore, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScreenStageProps {
  shares: TrackReference[];
  focused: TrackReference;
  onFocus: (sid: string) => void;
}

function sharerName(ref: TrackReference): string {
  return ref.participant.isLocal ? "Você" : ref.participant.name || ref.participant.identity;
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

export function ScreenStage({ shares, focused, onFocus }: ScreenStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null && document.fullscreenElement === stageRef.current,
    () => false,
  );

  // O Safari do iPhone não tem tela cheia para elementos comuns: sem a API, sem o botão.
  const canFullscreen = document.fullscreenEnabled;

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

  return (
    <section
      ref={stageRef}
      data-flip-id="stage"
      aria-label={`Tela compartilhada por ${sharerName(focused)}`}
      className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-black shadow-soft"
    >
      <VideoTrack
        trackRef={focused}
        className="size-full object-contain"
        aria-label={`Tela de ${sharerName(focused)}`}
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        <span className="glass pointer-events-auto inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-soft opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-soft" />
          </span>
          {focused.participant.isLocal
            ? "Você está apresentando"
            : `Tela de ${sharerName(focused)}`}
        </span>

        {canFullscreen ? (
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
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
      </div>

      {shares.length > 1 ? (
        <div
          role="tablist"
          aria-label="Telas compartilhadas"
          className="glass absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-1 overflow-x-auto rounded-xl p-1"
        >
          {shares.map((share) => {
            const sid = share.publication.trackSid;
            const active = sid === focused.publication.trackSid;
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
