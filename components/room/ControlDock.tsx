"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { MediaDeviceFailure, ScreenSharePresets } from "livekit-client";
import { Link2, MessageSquare, Mic, MicOff, PhoneOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useShortcut } from "@/hooks/useShortcut";
import { copyRoomLink } from "@/lib/copy-room-link";
import type { ChatState } from "./Chat";
import { DockButton } from "./DockButton";
import { MicMenu } from "./MicMenu";
import { ReactionsMenu } from "./Reactions";
import { ShareMenu, type ShareChoice } from "./ShareMenu";

interface ControlDockProps {
  code: string;
  chat: ChatState;
  onLeave: () => void;
}

function canShareScreen(): boolean {
  return "getDisplayMedia" in (navigator.mediaDevices ?? {});
}

export function ControlDock({ code, chat, onLeave }: ControlDockProps) {
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

  useShortcut("m", () => void toggleMic(), busy !== "mic");

  async function startScreenShare({ surface, audio }: ShareChoice) {
    // Texto (tela, janela): 15fps sobra banda para cada quadro sair nítido.
    // Aba costuma ser vídeo ou slides animados: 30fps.
    const preset =
      surface === "browser" ? ScreenSharePresets.h1080fps30 : ScreenSharePresets.h1080fps15;
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
          resolution: preset.resolution,
        },
        { screenShareEncoding: preset.encoding },
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
          shortcut="M"
          disabled={busy === "mic"}
          onClick={() => void toggleMic()}
        >
          {isMicrophoneEnabled ? (
            <Mic className="size-5" aria-hidden="true" />
          ) : (
            <MicOff className="size-5" aria-hidden="true" />
          )}
        </DockButton>
        <MicMenu />

        <ShareMenu
          isSharing={isScreenShareEnabled}
          supported={shareSupported}
          busy={busy === "screen"}
          onShare={(choice) => void startScreenShare(choice)}
          onStop={() => void stopScreenShare()}
        />

        <ReactionsMenu />

        <DockButton
          label={
            chat.unread > 0
              ? `Chat (${chat.unread} ${chat.unread === 1 ? "nova" : "novas"})`
              : "Chat"
          }
          tone={chat.open ? "active" : "default"}
          pressed={chat.open}
          shortcut="C"
          onClick={() => chat.setOpen(!chat.open)}
          className="relative"
        >
          <MessageSquare className="size-5" aria-hidden="true" />
          {chat.unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.7rem] font-bold text-brand-ink"
            >
              {chat.unread > 9 ? "9+" : chat.unread}
            </span>
          ) : null}
        </DockButton>

        {/* No celular o link fica só no topo da sala: o dock não cabe com tudo. */}
        <DockButton
          label="Copiar link da sala"
          onClick={() => void copyRoomLink(code)}
          className="max-sm:hidden"
        >
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
