"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { MediaDeviceFailure } from "livekit-client";
import { MessageSquare, Mic, MicOff, PhoneOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useShortcut } from "@/hooks/useShortcut";
import { canShareScreen } from "@/lib/share-support";
import type { ChatState } from "./Chat";
import { DockButton } from "./DockButton";
import { MicMenu } from "./MicMenu";
import { ReactionsMenu } from "./Reactions";
import { ShareMenu } from "./ShareMenu";
import { MIC_ERROR_TOAST } from "./toast-ids";
import type { ScreenShareControl } from "./use-screen-share";

interface ControlDockProps {
  chat: ChatState;
  share: ScreenShareControl;
  onLeave: () => void;
}

/**
 * Dock da sala (cápsula de vidro, estilo FaceTime): cada botão com o nome
 * embaixo. "Compartilhar" em verde por ser a ação principal; "Sair" separado
 * e vermelho. O link da sala fica na barra do topo.
 */
export function ControlDock({ chat, share, onLeave }: ControlDockProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [micBusy, setMicBusy] = useState(false);
  const shareSupported = canShareScreen();

  async function toggleMic() {
    setMicBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      toast.error(
        MediaDeviceFailure.getFailure(error) === MediaDeviceFailure.PermissionDenied
          ? "Permissão do microfone negada. Libere o acesso nas configurações do navegador."
          : "Não foi possível alterar o microfone. Confira o dispositivo e tente novamente.",
        { id: MIC_ERROR_TOAST },
      );
    } finally {
      setMicBusy(false);
    }
  }

  useShortcut("m", () => void toggleMic(), !micBusy);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav
        data-anim="dock"
        aria-label="Controles da chamada"
        className="glass pointer-events-auto flex items-start gap-1 rounded-[2rem] px-2.5 pt-2.5 pb-2 sm:gap-2 sm:px-4"
      >
        <DockButton
          label={isMicrophoneEnabled ? "Desligar microfone" : "Ligar microfone"}
          tone={isMicrophoneEnabled ? "default" : "muted"}
          caption={isMicrophoneEnabled ? "Microfone" : "Mudo"}
          pressed={!isMicrophoneEnabled}
          shortcut="M"
          disabled={micBusy}
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
          isSharing={share.isSharing}
          supported={shareSupported}
          busy={share.busy}
          onShare={(choice) => void share.start(choice)}
          onStop={() => void share.stop()}
        />

        <ReactionsMenu />

        <DockButton
          label={
            chat.unread > 0
              ? `Chat (${chat.unread} ${chat.unread === 1 ? "nova" : "novas"})`
              : "Chat"
          }
          tone={chat.open ? "active" : "default"}
          caption="Chat"
          pressed={chat.open}
          shortcut="C"
          onClick={() => chat.setOpen(!chat.open)}
          className="relative"
        >
          <MessageSquare className="size-5" aria-hidden="true" />
          {chat.unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 right-0 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-bold text-brand-ink ring-2 ring-surface"
            >
              {chat.unread > 9 ? "9+" : chat.unread}
            </span>
          ) : null}
        </DockButton>

        <span aria-hidden="true" className="mx-1 mt-2 h-8 w-px self-start bg-line sm:mx-2" />

        <DockButton label="Sair da sala" tone="danger" caption="Sair" onClick={onLeave}>
          <PhoneOff className="size-5" aria-hidden="true" />
        </DockButton>
      </nav>
    </div>
  );
}
