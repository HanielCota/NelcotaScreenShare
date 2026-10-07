"use client";

import { useIsMuted, useIsSpeaking } from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { MicOff, MonitorUp } from "lucide-react";
import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { initials, participantName } from "@/features/room/domain/participant-label";

interface ParticipantTileProps {
  participant: Participant;
  isSharing: boolean;
  compact: boolean;
}

export function ParticipantTile({ participant, isSharing, compact }: ParticipantTileProps) {
  const scope = useRef<HTMLDivElement>(null);
  const pulse = useRef<gsap.core.Tween | null>(null);
  const isSpeaking = useIsSpeaking(participant);
  const isMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const name = participantName(participant);

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
    { scope, dependencies: [isSpeaking, compact] },
  );

  if (compact) {
    // Palco ocupado: avatar redondo com o nome embaixo (estilo FaceTime).
    return (
      // key por variante: sem ela o React reaproveita os divs do bloco grande e o
      // avatar herda estilos que o GSAP deixou neles (o brilho com opacidade 0).
      <div
        key="avatar"
        ref={scope}
        data-flip-id={`tile-${participant.identity}`}
        className="flex w-20 shrink-0 flex-col items-center gap-2 lg:w-full lg:flex-row lg:gap-3"
      >
        <div className="relative isolate shrink-0">
          <div
            data-glow
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1.5 -z-10 rounded-full bg-brand/40 opacity-0 blur-md"
          />
          <div
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-full bg-surface-3 text-lg font-bold text-ink ring-1 ring-line"
          >
            {initials(name)}
          </div>
          <div
            data-ring
            aria-hidden="true"
            className="pointer-events-none absolute -inset-0.5 rounded-full opacity-0 ring-3 ring-brand-soft"
          />
          {isMuted ? (
            <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-danger text-canvas ring-2 ring-canvas">
              <MicOff className="size-3.5" aria-hidden="true" />
              <span className="sr-only">microfone desligado</span>
            </span>
          ) : null}
          {isSharing ? (
            <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-brand text-brand-ink ring-2 ring-canvas">
              <MonitorUp className="size-3.5" aria-hidden="true" />
              <span className="sr-only">compartilhando a tela</span>
            </span>
          ) : null}
        </div>
        <span className="w-full truncate text-center text-sm font-semibold lg:text-left lg:text-base">
          {participant.isLocal ? "Você" : name}
        </span>
        {isSpeaking ? <span className="sr-only">{name} está falando</span> : null}
      </div>
    );
  }

  return (
    <div
      key="tile"
      ref={scope}
      data-flip-id={`tile-${participant.identity}`}
      className="relative isolate aspect-video w-full shrink-0 rounded-3xl"
    >
      {/* Glow e anel de quem está falando. */}
      <div
        data-glow
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 -z-10 rounded-[1.65rem] bg-brand/30 opacity-0 blur-md"
      />
      <div className="relative flex size-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
        <div
          data-ring
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 ring-3 ring-brand-soft ring-inset"
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.04),transparent)]" />

        <div
          className="grid size-20 place-items-center rounded-full bg-surface-3 text-2xl font-bold text-ink ring-1 ring-line sm:size-24 sm:text-3xl"
          aria-hidden="true"
        >
          {initials(name)}
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <span className="glass inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold">
            <span className="truncate">
              {name}
              {participant.isLocal ? (
                <span className="font-normal text-ink-muted"> (você)</span>
              ) : null}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {isSharing ? (
              <span className="grid size-8 place-items-center rounded-full bg-brand text-brand-ink">
                <MonitorUp className="size-4" aria-hidden="true" />
                <span className="sr-only">compartilhando a tela</span>
              </span>
            ) : null}
            {isMuted ? (
              <span className="grid size-8 place-items-center rounded-full bg-danger text-canvas">
                <MicOff className="size-4" aria-hidden="true" />
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
