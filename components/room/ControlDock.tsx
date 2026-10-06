"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { MediaDeviceFailure, ScreenSharePresets } from "livekit-client";
import { Link2, Mic, MicOff, PhoneOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { copyRoomLink } from "@/lib/copy-room-link";
import { DockButton } from "./DockButton";
import { ShareMenu, type ShareChoice } from "./ShareMenu";

interface ControlDockProps {
  code: string;
  onLeave: () => void;
}

function canShareScreen(): boolean {
  return "getDisplayMedia" in (navigator.mediaDevices ?? {});
}

export function ControlDock({ code, onLeave }: ControlDockProps) {
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant();
  const [busy, setBusy] = useState<"mic" | "screen" | null>(null);
  const shareSupported = canShareScreen();

  async function toggleMic() {
    setBusy("mic");
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      toast.error(
        MediaDeviceFailure.getFailure(error) === MediaDeviceFailure.PermissionDenied
          ? "Permissão do microfone negada. Libere o acesso nas configurações do navegador."
          : "Não foi possível alterar o microfone. Confira o dispositivo e tente novamente.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function startScreenShare({ surface, audio }: ShareChoice) {
    setBusy("screen");
    try {
      await localParticipant.setScreenShareEnabled(
        true,
        {
          // Abre o seletor do navegador direto na aba escolhida no nosso menu.
          video: { displaySurface: surface },
          audio: audio
            ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            : false,
          systemAudio: audio ? "include" : "exclude",
          selfBrowserSurface: "exclude",
          surfaceSwitching: "include",
          contentHint: surface === "browser" ? "motion" : "detail",
          resolution: ScreenSharePresets.h1080fps30.resolution,
        },
        { screenShareEncoding: ScreenSharePresets.h1080fps30.encoding },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.info(
          "O compartilhamento foi cancelado ou bloqueado. Tente de novo e confirme a tela no navegador.",
        );
      } else if (error instanceof DOMException && error.name === "NotSupportedError") {
        toast.error(
          "Este navegador não consegue compartilhar a tela. Tente pelo Chrome, Edge ou Firefox no computador.",
        );
      } else {
        toast.error(
          "Não foi possível compartilhar a tela. Tente de novo e confirme a tela no seletor do navegador.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function stopScreenShare() {
    setBusy("screen");
    try {
      await localParticipant.setScreenShareEnabled(false);
    } catch {
      toast.error(
        "Não foi possível parar o compartilhamento. Tente novamente ou use o botão Parar compartilhamento do navegador.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav
        data-anim="dock"
        aria-label="Controles da chamada"
        className="glass pointer-events-auto flex items-center gap-2 rounded-3xl p-2 sm:gap-2.5 sm:p-2.5"
      >
        <DockButton
          label={isMicrophoneEnabled ? "Desligar microfone" : "Ligar microfone"}
          tone={isMicrophoneEnabled ? "default" : "muted"}
          pressed={!isMicrophoneEnabled}
          disabled={busy === "mic"}
          onClick={() => void toggleMic()}
        >
          {isMicrophoneEnabled ? (
            <Mic className="size-5" aria-hidden="true" />
          ) : (
            <MicOff className="size-5" aria-hidden="true" />
          )}
        </DockButton>

        <ShareMenu
          isSharing={isScreenShareEnabled}
          supported={shareSupported}
          busy={busy === "screen"}
          onShare={(choice) => void startScreenShare(choice)}
          onStop={() => void stopScreenShare()}
        />

        <DockButton label="Copiar link da sala" onClick={() => void copyRoomLink(code)}>
          <Link2 className="size-5" aria-hidden="true" />
        </DockButton>

        <span aria-hidden="true" className="mx-1 h-8 w-px bg-line" />

        <DockButton label="Sair da sala" tone="danger" onClick={onLeave}>
          <PhoneOff className="size-5" aria-hidden="true" />
        </DockButton>
      </nav>
    </div>
  );
}
