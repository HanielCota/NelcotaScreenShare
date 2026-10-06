"use client";

import { useIsMuted, useIsSpeaking } from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { MicOff, MonitorUp } from "lucide-react";
import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface ParticipantTileProps {
  participant: Participant;
  isSharing: boolean;
  compact: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function ParticipantTile({ participant, isSharing, compact }: ParticipantTileProps) {
  const scope = useRef<HTMLDivElement>(null);
  const pulse = useRef<gsap.core.Tween | null>(null);
  const isSpeaking = useIsSpeaking(participant);
  const isMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const name = participant.name || participant.identity;

  // Pulso suave na borda de quem está falando.
  useGSAP(
    () => {
      pulse.current?.kill();
      pulse.current = null;
      const reduced = prefersReducedMotion();

      if (isSpeaking) {
        gsap.to("[data-ring]", { opacity: 1, duration: reduced ? 0 : 0.2, overwrite: "auto" });
        if (!reduced) {
          pulse.current = gsap.fromTo(
            "[data-glow]",
            { opacity: 0.35, scale: 1 },
            {
              opacity: 0.8,
              scale: 1.03,
              duration: 0.75,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            },
          );
        }
      } else {
        gsap.to(["[data-ring]", "[data-glow]"], {
          opacity: 0,
          scale: 1,
          duration: reduced ? 0 : 0.4,
          overwrite: "auto",
        });
      }
    },
    { scope, dependencies: [isSpeaking] },
  );

  return (
    <div
      ref={scope}
      data-flip-id={`tile-${participant.identity}`}
      className={cn(
        "relative isolate shrink-0 rounded-2xl",
        compact ? "aspect-video w-44 sm:w-52 lg:w-full" : "aspect-video w-full",
      )}
    >
      {/* Glow e anel de quem está falando. */}
      <div
        data-glow
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 -z-10 rounded-[1.15rem] bg-brand/30 opacity-0 blur-md"
      />
      <div className="relative flex size-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
        <div
          data-ring
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-2 ring-brand-soft ring-inset"
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.04),transparent)]" />

        <div
          className={cn(
            "grid place-items-center rounded-full bg-surface-3 font-bold text-ink ring-1 ring-line",
            compact ? "size-12 text-base" : "size-16 text-xl sm:size-20 sm:text-2xl",
          )}
          aria-hidden="true"
        >
          {initials(name)}
        </div>

        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
          <span className="glass inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold">
            <span className="truncate">
              {name}
              {participant.isLocal ? (
                <span className="font-medium text-ink-subtle"> (você)</span>
              ) : null}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {isSharing ? (
              <span className="grid size-6 place-items-center rounded-lg bg-brand/20 text-brand-soft">
                <MonitorUp className="size-3.5" aria-hidden="true" />
                <span className="sr-only">compartilhando a tela</span>
              </span>
            ) : null}
            {isMuted ? (
              <span className="grid size-6 place-items-center rounded-lg bg-danger/15 text-danger">
                <MicOff className="size-3.5" aria-hidden="true" />
                <span className="sr-only">microfone desligado</span>
              </span>
            ) : null}
          </span>
        </div>
        {isSpeaking ? <span className="sr-only">{name} está falando</span> : null}
      </div>
    </div>
  );
}
