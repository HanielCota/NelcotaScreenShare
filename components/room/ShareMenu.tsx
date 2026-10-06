"use client";

import { AppWindow, Globe, Monitor, MonitorOff, MonitorUp, Volume2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { gsap, MOTION_QUERIES, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { DockButton } from "./DockButton";

type ShareSurface = "monitor" | "window" | "browser";

export interface ShareChoice {
  surface: ShareSurface;
  audio: boolean;
}

interface ShareMenuProps {
  isSharing: boolean;
  supported: boolean;
  busy: boolean;
  onShare: (choice: ShareChoice) => void;
  onStop: () => void;
}

const OPTIONS: {
  surface: ShareSurface;
  title: string;
  description: string;
  icon: typeof Monitor;
}[] = [
  {
    surface: "monitor",
    title: "Tela inteira",
    description: "Tudo o que aparece no seu monitor",
    icon: Monitor,
  },
  {
    surface: "window",
    title: "Janela",
    description: "Um aplicativo específico, sem o resto da tela",
    icon: AppWindow,
  },
  {
    surface: "browser",
    title: "Aba do navegador",
    description: "Ideal para vídeos e slides, com o áudio da aba",
    icon: Globe,
  },
];

const AUDIO_HINT: Record<ShareSurface, string> = {
  monitor: "Áudio do sistema (Windows e ChromeOS).",
  window: "O navegador não captura áudio de janelas.",
  browser: "Áudio só da aba escolhida.",
};

/**
 * Menu próprio antes do seletor nativo: a pessoa escolhe o tipo de superfície
 * e o seletor do navegador já abre na aba correspondente (`displaySurface`).
 */
export function ShareMenu({ isSharing, supported, busy, onShare, onStop }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [audio, setAudio] = useState(true);
  const [hovered, setHovered] = useState<ShareSurface>("monitor");

  const label = !supported
    ? "Compartilhar tela não é suportado neste navegador"
    : isSharing
      ? "Parar de compartilhar"
      : "Compartilhar tela";

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next && !supported) {
          toast.info(
            "Este navegador não compartilha tela. Use Chrome, Edge ou Firefox no computador.",
          );
          return;
        }
        // Compartilhando: o botão para na hora, sem abrir o menu.
        if (next && isSharing) {
          onStop();
          return;
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <DockButton
          label={label}
          tone={isSharing ? "active" : "default"}
          pressed={isSharing}
          aria-disabled={!supported || undefined}
          disabled={busy}
        >
          {isSharing ? (
            <MonitorOff className="size-5" aria-hidden="true" />
          ) : (
            <MonitorUp className="size-5" aria-hidden="true" />
          )}
        </DockButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={14}
          collisionPadding={16}
          aria-label="Opções de compartilhamento"
          className="z-50 w-[min(22rem,calc(100vw-2rem))] outline-none"
        >
          <ShareMenuPanel
            audio={audio}
            hovered={hovered}
            onAudioChange={setAudio}
            onHover={setHovered}
            onPick={(surface) => {
              setOpen(false);
              onShare({ surface, audio: audio && surface !== "window" });
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface PanelProps {
  audio: boolean;
  hovered: ShareSurface;
  onAudioChange: (value: boolean) => void;
  onHover: (surface: ShareSurface) => void;
  onPick: (surface: ShareSurface) => void;
}

function ShareMenuPanel({ audio, hovered, onAudioChange, onHover, onPick }: PanelProps) {
  const scope = useRef<HTMLDivElement>(null);
  const audioId = useId();

  // Entrada: painel sobe do dock e as opções chegam em stagger.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES.motion, () => {
        gsap
          .timeline()
          .from(scope.current, {
            y: 12,
            scale: 0.96,
            opacity: 0,
            duration: 0.3,
            transformOrigin: "50% 100%",
          })
          .from(
            "[data-anim=share-option]",
            { y: 8, opacity: 0, duration: 0.3, stagger: 0.05 },
            "-=0.2",
          );
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="glass rounded-2xl p-2 will-change-transform">
      <p className="px-3 pt-2 pb-2.5 text-sm font-semibold tracking-tight">
        O que você quer compartilhar?
      </p>

      <ul className="flex flex-col gap-1">
        {OPTIONS.map(({ surface, title, description, icon: Icon }, index) => (
          <li key={surface} data-anim="share-option">
            <button
              type="button"
              autoFocus={index === 0}
              onClick={() => onPick(surface)}
              onPointerEnter={() => onHover(surface)}
              onFocus={() => onHover(surface)}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-3 focus-visible:bg-surface-3"
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                  hovered === surface ? "bg-brand text-brand-ink" : "bg-surface-2 text-brand-soft",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-ink-subtle">{description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div
        data-anim="share-option"
        className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Volume2 className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          <Label htmlFor={audioId} className="min-w-0 flex-col items-start gap-1">
            <span className="text-sm font-semibold">Incluir áudio</span>
            <span className="text-xs font-normal text-ink-subtle">{AUDIO_HINT[hovered]}</span>
          </Label>
        </div>
        <Switch id={audioId} checked={audio} onCheckedChange={onAudioChange} />
      </div>
    </div>
  );
}
