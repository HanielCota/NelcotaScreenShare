import { AppWindow, Globe, Monitor, MonitorOff, MonitorUp, Volume2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useShortcut } from "@/lib/hooks/use-shortcut";
import { cn } from "@/lib/utils";
import { DockButton } from "./DockButton";
import { DockPopoverContent, DockPopoverTitle } from "./DockPopover";
import {
  canShare,
  type ShareChoice,
  type ShareSurface,
} from "@/features/room/domain/share-support";
import { useShareSupport } from "@/features/room/hooks/use-share-support";

interface ShareMenuProps {
  isSharing: boolean;
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

/** Seconds since `running` became true; resets to zero on stop. */
function useElapsedSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => {
      window.clearInterval(id);
      setSeconds(0);
    };
  }, [running]);
  return seconds;
}

function formatElapsed(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${String(m).padStart(2, "0")}:${s}`;
}

/**
 * Our own menu before the native picker: the person chooses the surface type
 * and the browser picker opens on the matching tab (`displaySurface`).
 */
export function ShareMenu({ isSharing, busy, onShare, onStop }: ShareMenuProps) {
  const support = useShareSupport();
  // Same rule as the notes before joining: phones and tablets watch, they do not share.
  const supported = support !== null && canShare(support);
  const [open, setOpen] = useState(false);
  const [audio, setAudio] = useState(true);
  const [hovered, setHovered] = useState<ShareSurface>("monitor");
  // While sharing, the button shows for how long: makes it clear the screen is live.
  const elapsed = formatElapsed(useElapsedSeconds(isSharing));

  const label = !supported
    ? "Compartilhar tela não é suportado neste navegador"
    : isSharing
      ? `Parar de compartilhar (no ar há ${elapsed})`
      : "Compartilhar tela";

  function handleOpenChange(next: boolean) {
    if (next && !supported) {
      toast.info("Este navegador não compartilha tela. Use Chrome, Edge ou Firefox no computador.");
      return;
    }
    // While sharing: the button stops immediately, without opening the menu.
    if (next && isSharing) {
      onStop();
      return;
    }
    setOpen(next);
  }

  useShortcut("s", () => handleOpenChange(!open), !busy);

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <DockButton
          label={label}
          // Neutral until it starts (green in the dock looks "on"); red to stop.
          tone={isSharing ? "muted" : "default"}
          caption={busy ? "Aguarde…" : isSharing ? `Parar · ${elapsed}` : "Compartilhar"}
          shortCaption={busy ? "…" : isSharing ? elapsed : "Tela"}
          pressed={isSharing}
          shortcut="S"
          aria-disabled={!supported || undefined}
          disabled={busy}
          busy={busy}
          className="tabular-nums sm:min-w-24"
        >
          {isSharing ? (
            <MonitorOff className="size-5" aria-hidden="true" />
          ) : (
            <MonitorUp className="size-5" aria-hidden="true" />
          )}
        </DockButton>
      </Popover.Trigger>

      <DockPopoverContent
        aria-label="Opções de compartilhamento"
        className="w-[min(22rem,calc(100vw-2rem))]"
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
      </DockPopoverContent>
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
  const audioId = useId();

  return (
    <>
      <DockPopoverTitle>O que você quer compartilhar?</DockPopoverTitle>

      <ul className="flex flex-col gap-1">
        {OPTIONS.map(({ surface, title, description, icon: Icon }, index) => (
          <li key={surface}>
            <button
              type="button"
              autoFocus={index === 0}
              onClick={() => onPick(surface)}
              onPointerEnter={() => onHover(surface)}
              onFocus={() => onHover(surface)}
              className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none active:bg-surface-3/70"
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
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-ink-subtle">{description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Volume2 className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          <Label htmlFor={audioId} className="min-w-0 flex-col items-start gap-1">
            <span className="text-sm font-medium">Incluir áudio</span>
            <span className="text-xs font-normal text-ink-subtle">{AUDIO_HINT[hovered]}</span>
          </Label>
        </div>
        <Switch id={audioId} checked={audio} onCheckedChange={onAudioChange} />
      </div>
    </>
  );
}
