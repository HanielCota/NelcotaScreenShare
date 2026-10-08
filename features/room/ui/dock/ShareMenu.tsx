import { MonitorOff, MonitorUp } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShortcut } from "@/lib/hooks/use-shortcut";
import { DockButton } from "./DockButton";
import { DockPopoverContent } from "./DockPopover";
import { SharePanel } from "./SharePanel";
import { canShare, type ShareChoice } from "@/features/room/domain/share-support";
import { useShareSupport } from "@/features/room/hooks/use-share-support";

interface ShareMenuProps {
  isSharing: boolean;
  busy: boolean;
  onShare: (choice: ShareChoice) => void;
  onStop: () => void;
}

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

  // The key only opens the menu: one stray press must not take the screen off the air.
  useShortcut("s", () => handleOpenChange(!open), !busy && !isSharing);

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
          shortcut={isSharing ? undefined : "S"}
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
        <SharePanel
          audio={audio}
          onAudioChange={setAudio}
          onPick={(choice) => {
            setOpen(false);
            onShare(choice);
          }}
        />
      </DockPopoverContent>
    </Popover.Root>
  );
}
